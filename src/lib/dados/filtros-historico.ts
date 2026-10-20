import type { Catalogo, FiltroHistorico, PeriodoRelatorio } from "./tipos";

export const PERIODOS_HISTORICO: { valor: PeriodoRelatorio; rotulo: string }[] = [
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "mes", rotulo: "Este mês" },
];

type Parametros = { [chave: string]: string | string[] | undefined } | URLSearchParams;

/** Lê os filtros do histórico da URL (a página e o CSV usam a mesma leitura, então exportam o mesmo recorte). */
export function lerFiltrosHistorico(params: Parametros, catalogo: Catalogo, localId: string | null): FiltroHistorico {
  const ler = (chave: string) => {
    const valor = params instanceof URLSearchParams ? params.get(chave) : params[chave];
    return typeof valor === "string" && valor ? valor : undefined;
  };
  const periodo = ler("periodo");
  const categoria = ler("categoria");
  return {
    busca: ler("busca"),
    periodo: PERIODOS_HISTORICO.some((p) => p.valor === periodo) ? (periodo as PeriodoRelatorio) : "30d",
    categoriaId: catalogo.categorias.some((c) => c.id === categoria) ? categoria : undefined,
    localId,
  };
}
