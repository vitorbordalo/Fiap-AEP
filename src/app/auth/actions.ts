"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { emailPermitido, esquemaEmail } from "@/lib/auth/email";
import { caminhoSeguro, destinoAposLogin, LOGIN_ALUNO } from "@/lib/auth/rotas";
import { COOKIE_SESSAO_DEMO, ehPapel, escreverSessaoDemo } from "@/lib/auth/sessao-demo";
import { dominiosPermitidos, envPublico } from "@/lib/env";
import { MODO_DEMO } from "@/lib/modo";
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

  (await cookies()).set(COOKIE_SESSAO_DEMO, escreverSessaoDemo({ papel, nome }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  const next = caminhoSeguro(formData.get("next")?.toString());
  redirect(destinoAposLogin(papel, next ? `?next=${encodeURIComponent(next)}` : ""));
}

const NOME_PADRAO = { aluno: "Aluno Teste", monitor: "Monitor Teste", equipe: "Equipe Teste", gestor: "Coordenação" };

export async function sair() {
  if (MODO_DEMO) {
    (await cookies()).delete(COOKIE_SESSAO_DEMO);
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(LOGIN_ALUNO);
}
