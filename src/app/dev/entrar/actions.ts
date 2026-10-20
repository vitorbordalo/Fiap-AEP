"use server";

import { notFound, redirect } from "next/navigation";
import usuariosTeste from "@scripts/seed/usuarios-teste.json";
import { AREA_DO_PAPEL } from "@/lib/auth/rotas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/supabase/database.types";

/**
 * Entra como um usuário de teste sem passar pelo e-mail: gera o link mágico pela API de admin
 * e já confirma o token no servidor. Só em desenvolvimento e só para os usuários do seed.
 */
export async function entrarComo(formData: FormData) {
  if (process.env.NODE_ENV !== "development") notFound();

  const usuario = usuariosTeste.find((u) => u.email === formData.get("email"));
  if (!usuario) notFound();

  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: usuario.email,
  });
  if (error) {
    throw new Error(`Não foi possível gerar o acesso (${error.message}). Rodou "npm run db:seed"?`);
  }

  const supabase = await createClient();
  const { error: erroSessao } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (erroSessao) throw new Error(`Não foi possível entrar (${erroSessao.message}).`);

  redirect(AREA_DO_PAPEL[usuario.role as Papel]);
}
