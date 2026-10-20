import type { Papel } from "@/lib/supabase/database.types";

/** Cookie da sessão no modo demonstração: só o papel escolhido e o nome digitado. Nunca a senha. */
export const COOKIE_SESSAO_DEMO = "ap_sessao_demo";

export type SessaoDemo = { papel: Papel; nome: string };

const PAPEIS: readonly Papel[] = ["aluno", "monitor", "equipe", "gestor"];

export function ehPapel(valor: unknown): valor is Papel {
  return typeof valor === "string" && (PAPEIS as readonly string[]).includes(valor);
}

export function escreverSessaoDemo(sessao: SessaoDemo) {
  return encodeURIComponent(JSON.stringify(sessao));
}

export function lerSessaoDemo(valor: string | undefined): SessaoDemo | null {
  if (!valor) return null;
  try {
    const dados: unknown = JSON.parse(decodeURIComponent(valor));
    if (typeof dados !== "object" || dados === null) return null;
    const { papel, nome } = dados as Record<string, unknown>;
    if (!ehPapel(papel)) return null;
    return { papel, nome: typeof nome === "string" ? nome.slice(0, 60) : "" };
  } catch {
    return null;
  }
}
