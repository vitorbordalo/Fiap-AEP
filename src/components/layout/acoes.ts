"use server";

import { cookies } from "next/headers";
import { COOKIE_LOCAL, TODOS_OS_LOCAIS } from "@/lib/auth/local-visao";
import { exigirPapelNaAcao } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";

/** Troca o local exibido para equipe e gestor (seletor do topo). */
export async function escolherLocal(localId: string) {
  await exigirPapelNaAcao("equipe", "gestor");
  const { locais } = await dados().catalogo();
  const valido = localId === TODOS_OS_LOCAIS || locais.some((l) => l.id === localId);
  if (!valido) throw new Error("Local inválido.");

  (await cookies()).set(COOKIE_LOCAL, localId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
