"use server";

import { redirect } from "next/navigation";
import { emailPermitido, esquemaEmail } from "@/lib/auth/email";
import { caminhoSeguro, LOGIN_ALUNO } from "@/lib/auth/rotas";
import { dominiosPermitidos, envPublico } from "@/lib/env";
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

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_ALUNO);
}
