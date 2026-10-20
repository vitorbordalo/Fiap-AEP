import type { Metadata } from "next";
import Link from "next/link";
import { Info, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { ItemLinha } from "@/components/itens/item-linha";
import { GuardadoBadge } from "@/components/itens/situacao-pedido";
import { NavAluno } from "@/components/layout/nav-aluno";
import { TopoMobile } from "@/components/layout/topo-mobile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { dados, type FiltroBuscaAluno } from "@/lib/dados";
import { ehPeriodo, PERIODO_LABEL } from "@/lib/dominio/periodo";
import { plural } from "@/lib/formato";

export const metadata: Metadata = { title: "Resultados" };

const texto = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

/** A3 · Resultados da busca */
export default async function AlunoResultadosPage({ searchParams }: PageProps<"/aluno/resultados">) {
  const params = await searchParams;
  const catalogo = await dados().catalogo();

  const data = texto(params.data);
  const periodoParam = texto(params.periodo);
  const filtro: FiltroBuscaAluno = {
    data: data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined,
    periodo: ehPeriodo(periodoParam) ? periodoParam : undefined,
    salaId: catalogo.salas.some((s) => s.id === params.sala) ? texto(params.sala) : undefined,
    categoriaId: catalogo.categorias.some((c) => c.id === params.categoria) ? texto(params.categoria) : undefined,
  };
  const itens = await dados().buscarItensPublicos(filtro);

  // cada chip remove o próprio filtro mantendo os outros
  const semFiltro = (chave: "data" | "periodo" | "sala" | "categoria") => {
    const restantes = new URLSearchParams();
    if (filtro.data && chave !== "data") restantes.set("data", filtro.data);
    if (filtro.periodo && chave !== "periodo") restantes.set("periodo", filtro.periodo);
    if (filtro.salaId && chave !== "sala") restantes.set("sala", filtro.salaId);
    if (filtro.categoriaId && chave !== "categoria") restantes.set("categoria", filtro.categoriaId);
    return `/aluno/resultados?${restantes}`;
  };

  const chips = [
    filtro.data && { chave: "data" as const, rotulo: filtro.data.split("-").reverse().slice(0, 2).join("/") },
    filtro.periodo && { chave: "periodo" as const, rotulo: PERIODO_LABEL[filtro.periodo] },
    filtro.salaId && { chave: "sala" as const, rotulo: catalogo.salas.find((s) => s.id === filtro.salaId)?.nome ?? "" },
    filtro.categoriaId && {
      chave: "categoria" as const,
      rotulo: catalogo.categorias.find((c) => c.id === filtro.categoriaId)?.nome ?? "",
    },
  ].filter((c): c is { chave: "data" | "periodo" | "sala" | "categoria"; rotulo: string } => Boolean(c));

  return (
    <>
      <TopoMobile
        titulo="Resultados"
        voltarPara="/aluno"
        acao={
          <Link href="/aluno" aria-label="Alterar filtros" className="grid size-12 place-items-center rounded-full bg-surface-elevated">
            <SlidersHorizontal className="size-5" aria-hidden />
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-4 px-5 pb-6">
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Filtros aplicados">
            {chips.map((chip) => (
              <li key={chip.chave}>
                <span className="inline-flex h-10 items-center gap-1 rounded-full bg-surface-elevated pr-1 pl-4 text-label font-semibold">
                  {chip.rotulo}
                  <Link
                    href={semFiltro(chip.chave)}
                    aria-label={`Remover filtro ${chip.rotulo}`}
                    className="grid size-8 place-items-center rounded-full text-muted hover:bg-border hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}

        {itens.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-label text-muted" role="status">
                {plural(itens.length, "item encontrado", "itens encontrados")}
              </p>
              <span className="flex items-center gap-1.5 text-caption text-muted">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                Mais recentes primeiro
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {itens.map((item) => (
                <li key={item.id}>
                  <ItemLinha item={item} href={`/aluno/itens/${item.id}`} badge={<GuardadoBadge />} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            icon={PackageSearch}
            message="Ainda não foi encontrado. Volte a consultar amanhã."
            action={
              <Button asChild variant="secondary">
                <Link href="/aluno">Alterar busca</Link>
              </Button>
            }
          />
        )}

        <p className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-label font-normal text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Não encontrou? Os itens são cadastrados todas as noites pelos monitores. Volte a consultar amanhã.
        </p>
      </div>
      <NavAluno />
    </>
  );
}
