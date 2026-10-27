"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { emailPermitido, esquemaEmail } from "@/lib/auth/email";
import { COOKIE_LOCAL } from "@/lib/auth/local-visao";
import { caminhoSeguro, destinoAposLogin, LOGIN_ALUNO } from "@/lib/auth/rotas";
import { COOKIE_SESSAO_DEMO, ehPapel, escreverSessaoDemo } from "@/lib/auth/sessao-demo";
import { renomearPerfilDeTeste } from "@/lib/dados/demo";
import { dominiosPermitidos, envPublico } from "@/lib/env";
import { dentroDoLimite } from "@/lib/limite";
import { MODO_DEMO } from "@/lib/modo";
import type { Papel } from "@/lib/supabase/database.types";
import usuariosTeste from "@scripts/seed/usuarios-teste.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin =
  | { status: "inicial" }
  | { status: "erro"; mensagem: string }
  | { status: "enviado"; email: string };

/**
 * Envia o link mágico. O cadastro público fica desligado no Supabase: o usuário só é criado aqui,
 * depois de conferir o domínio no servidor. Assim ninguém contorna ALLOWED_EMAIL_DOMAINS chamando a API direto.
 */
export async function enviarLinkMagico(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const resultado = esquemaEmail.safeParse(formData.get("email"));
  if (!resultado.success) return { status: "erro", mensagem: "Digite um e-mail válido." };

  const email = resultado.data;
  const dominios = dominiosPermitidos();
  if (!emailPermitido(email, dominios)) {
    return { status: "erro", mensagem: `Use seu e-mail institucional (@${dominios[0]}).` };
  }

  // a criação de usuário usa a service role (sem limite do Supabase): limita aqui por e-mail e por IP
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  const dezMinutos = 10 * 60 * 1000;
  if (!dentroDoLimite(`email:${email}`, 5, dezMinutos) || !dentroDoLimite(`ip:${ip}`, 20, dezMinutos)) {
    return { status: "erro", mensagem: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." };
  }

  const { error: erroCriacao } = await createAdminClient().auth.admin.createUser({ email, email_confirm: true });
  if (erroCriacao && erroCriacao.code !== "email_exists" && erroCriacao.code !== "user_already_exists") {
    console.error("Falha ao criar usuário", erroCriacao);
    return { status: "erro", mensagem: "Não foi possível enviar o link agora. Tente de novo." };
  }

  // `next` sempre presente: o template de e-mail emenda "&token_hash=..." nesta URL (docs/supabase.md)
  const destino = new URL("/auth/confirmar", envPublico().NEXT_PUBLIC_SITE_URL);
  destino.searchParams.set("next", caminhoSeguro(formData.get("next")?.toString()) ?? "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: destino.toString() },
  });

  if (error) {
    if (error.status === 429) {
      return { status: "erro", mensagem: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo." };
    }
    console.error("Falha ao enviar link mágico", error);
    return { status: "erro", mensagem: "Não foi possível enviar o link agora. Tente de novo." };
  }

  return { status: "enviado", email };
}

/**
 * Login do modo demonstração: aceita qualquer usuário e senha. A senha é ignorada e nunca é guardada;
 * o cookie leva só o perfil escolhido e o nome digitado. Não existe quando o Supabase está configurado.
 */
export async function entrarDemo(formData: FormData) {
  if (!MODO_DEMO) throw new Error("Login de demonstração desligado.");

  const papel = formData.get("papel");
  if (!ehPapel(papel)) throw new Error("Perfil inválido.");
  const nome = formData.get("usuario")?.toString().trim().slice(0, 60) || NOME_PADRAO[papel];

  await iniciarSessaoDemo(papel, nome);

  const next = caminhoSeguro(formData.get("next")?.toString());
  redirect(destinoAposLogin(papel, next ? `?next=${encodeURIComponent(next)}` : ""));
}

/**
 * Abre a sessão de demonstração: cookie com perfil e nome, nome gravado no perfil de teste e
 * a visão da equipe de volta a "Todos os locais" (um local escolhido antes esconderia itens novos).
 */
async function iniciarSessaoDemo(papel: Papel, nome: string) {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO_DEMO, escreverSessaoDemo({ papel, nome }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  jar.delete(COOKIE_LOCAL);
  await renomearPerfilDeTeste(papel, nome);
}

/** Nome de cada persona da demonstração (scripts/seed/usuarios-teste.json). */
const NOME_PADRAO = Object.fromEntries(usuariosTeste.map((u) => [u.role, u.nome])) as Record<Papel, string>;

/**
 * Troca de perfil na demonstração, sem passar pelo login (botão "Trocar perfil").
 * Usa a persona de cada papel, para a história da apresentação fazer sentido
 * (ex.: "Pedido de Mariana Costa", "Registrado por Ana Souza").
 */
export async function trocarPerfilDemo(formData: FormData) {
  if (!MODO_DEMO) throw new Error("Troca de perfil só existe na demonstração.");
  const papel = formData.get("papel");
  if (!ehPapel(papel)) throw new Error("Perfil inválido.");

  await iniciarSessaoDemo(papel, NOME_PADRAO[papel]);
  redirect(destinoAposLogin(papel, ""));
}

export async function sair() {
  if (MODO_DEMO) {
    const jar = await cookies();
    jar.delete(COOKIE_SESSAO_DEMO);
    jar.delete(COOKIE_LOCAL);
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(LOGIN_ALUNO);
}
