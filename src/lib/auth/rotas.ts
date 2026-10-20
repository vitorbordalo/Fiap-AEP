import type { Papel } from "@/lib/supabase/database.types";

/** Área de cada perfil. Cada um só acessa a própria. */
export const AREA_DO_PAPEL: Record<Papel, string> = {
  aluno: "/aluno",
  monitor: "/monitor",
  equipe: "/equipe",
  gestor: "/gestor",
};

const PAPEIS = Object.keys(AREA_DO_PAPEL) as Papel[];

export const LOGIN_ALUNO = "/login";
export const LOGIN_MONITOR = "/monitor/login";
const PAGINAS_DE_LOGIN = new Set([LOGIN_ALUNO, LOGIN_MONITOR]);

/** Rotas abertas sem login: callback do link mágico e ferramentas de desenvolvimento. */
function ehRotaPublica(pathname: string) {
  return pathname.startsWith("/auth/") || pathname.startsWith("/dev/");
}

/** A qual área a rota pertence, se pertencer a alguma. */
export function areaDaRota(pathname: string): Papel | null {
  return PAPEIS.find((papel) => pathname === AREA_DO_PAPEL[papel] || pathname.startsWith(`${AREA_DO_PAPEL[papel]}/`)) ?? null;
}

/** Aceita só caminhos internos, para o ?next= não virar um redirecionamento aberto. */
export function caminhoSeguro(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

type EntradaDecisao = {
  pathname: string;
  /** Query string atual, com "?" (ou vazia). */
  search: string;
  logado: boolean;
  /** Papel do perfil; null se não logado ou se o perfil não foi encontrado. */
  papel: Papel | null;
};

export type Decisao = { tipo: "seguir" } | { tipo: "redirecionar"; para: string };

/**
 * Regra de acesso por rota, usada pelo proxy.
 * - Sem login: áreas protegidas mandam para o login (do monitor, se for a área do monitor) com ?next=.
 * - Com login: "/" e as páginas de login mandam para a área do perfil; a área de outro perfil também.
 */
export function decidirRota({ pathname, search, logado, papel }: EntradaDecisao): Decisao {
  if (PAGINAS_DE_LOGIN.has(pathname)) {
    if (logado && papel) return { tipo: "redirecionar", para: destinoAposLogin(papel, search) };
    return { tipo: "seguir" };
  }

  if (ehRotaPublica(pathname)) return { tipo: "seguir" };

  const area = areaDaRota(pathname);

  if (!logado || !papel) {
    if (pathname === "/") return { tipo: "redirecionar", para: LOGIN_ALUNO };
    if (!area) return { tipo: "seguir" };
    const login = area === "monitor" ? LOGIN_MONITOR : LOGIN_ALUNO;
    const next = encodeURIComponent(pathname + search);
    const motivo = logado ? "&erro=perfil" : "";
    return { tipo: "redirecionar", para: `${login}?next=${next}${motivo}` };
  }

  if (pathname === "/") return { tipo: "redirecionar", para: AREA_DO_PAPEL[papel] };
  if (area && area !== papel) return { tipo: "redirecionar", para: AREA_DO_PAPEL[papel] };
  return { tipo: "seguir" };
}

/** Depois do login: volta para o ?next= se for da área do perfil; senão, vai para a área dele. */
export function destinoAposLogin(papel: Papel, search: string) {
  const next = caminhoSeguro(new URLSearchParams(search).get("next"));
  if (next && areaDaRota(next.split("?")[0] ?? "") === papel) return next;
  return AREA_DO_PAPEL[papel];
}
