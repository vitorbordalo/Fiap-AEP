import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Papel, Tables } from "@/lib/supabase/database.types";
import { AREA_DO_PAPEL, LOGIN_ALUNO, LOGIN_MONITOR } from "./rotas";

export type Perfil = Tables<"profiles">;

/** Perfil de quem está logado, ou null. Uma consulta por requisição (cache do React). */
export const obterPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return perfil;
});

/**
 * Garante que quem está logado tem o papel da área. Use no layout de cada área:
 * é a segunda barreira depois do proxy (e o RLS é a terceira).
 */
export async function exigirPapel(papel: Papel): Promise<Perfil> {
  const perfil = await obterPerfil();
  if (!perfil) redirect(papel === "monitor" ? LOGIN_MONITOR : LOGIN_ALUNO);
  if (perfil.role !== papel) redirect(AREA_DO_PAPEL[perfil.role]);
  return perfil;
}
