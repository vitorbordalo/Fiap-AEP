import "server-only";
import { cookies } from "next/headers";
import { ehUuid } from "@/lib/utils";
import type { Perfil } from "./sessao";

/**
 * Local que a equipe ou o gestor está vendo (seletor no topo). Guardado em cookie,
 * sem alterar o perfil. Padrão: o local do perfil (equipe) ou todos (gestor).
 */
export const COOKIE_LOCAL = "ap_local";
export const TODOS_OS_LOCAIS = "todos";

export async function localDaVisao(perfil: Perfil): Promise<string | null> {
  const escolhido = (await cookies()).get(COOKIE_LOCAL)?.value;
  if (escolhido === TODOS_OS_LOCAIS) return null;
  // cookie adulterado ou antigo: ignora em vez de quebrar as consultas
  if (ehUuid(escolhido)) return escolhido;
  return perfil.role === "equipe" ? perfil.local_id : null;
}
