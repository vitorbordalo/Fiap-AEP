import "server-only";
import { cookies } from "next/headers";
import { ehUuid } from "@/lib/utils";

/**
 * Local que a equipe ou o gestor está vendo (seletor no topo). Guardado em cookie,
 * sem alterar o perfil. Padrão: todos os locais. Começar pelo local do perfil escondia da
 * equipe da Sala de TI o item que o monitor acabara de guardar no Achados e Perdidos
 * (o aluno via, a equipe não). O local do perfil continua aparecendo no topo.
 */
export const COOKIE_LOCAL = "ap_local";
export const TODOS_OS_LOCAIS = "todos";

export async function localDaVisao(): Promise<string | null> {
  const escolhido = (await cookies()).get(COOKIE_LOCAL)?.value;
  // "todos", vazio ou cookie adulterado/antigo: todos os locais, sem quebrar as consultas
  return ehUuid(escolhido) ? escolhido : null;
}
