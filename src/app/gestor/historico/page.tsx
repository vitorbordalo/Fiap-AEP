import type { Metadata } from "next";
import { CircleCheck, Download, History, Layers, Search, CalendarDays, Undo2 } from "lucide-react";
import { FormularioDeFiltros } from "@/components/gestor/filtros";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/feedback";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { lerFiltrosHistorico, PERIODOS_HISTORICO } from "@/lib/dados/filtros-historico";
import { formatarCodigo, formatarDataHoraCurta, plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Histórico de retiradas" };

const seletor =
  "h-10 w-full appearance-none rounded-lg border border-border bg-surface pr-4 pl-9 sm:w-auto text-label font-normal text-foreground focus:border-accent focus:outline-none";

/** G2 · Histórico de retiradas (auditoria), com exportação CSV do mesmo recorte. */
export default async function GestorHistoricoPage({ searchParams }: PageProps<"/gestor/historico">) {
  const perfil = await exigirPapel("gestor");
  const params = await searchParams;
  const catalogo = await dados().catalogo();
  const filtro = lerFiltrosHistorico(params, catalogo, await localDaVisao(perfil));
  const linhas = await dados().historico(filtro);

  const query = new URLSearchParams();
  if (filtro.busca) query.set("busca", filtro.busca);
  if (filtro.periodo) query.set("periodo", filtro.periodo);
  if (filtro.categoriaId) query.set("categoria", filtro.categoriaId);
  const validas = linhas.filter((l) => !l.desfeita).length;

  return (
    <ConteudoDesktop>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-display">Histórico de retiradas</h1>
            <p className="text-body text-muted">
              {PERIODOS_HISTORICO.find((p) => p.valor === filtro.periodo)?.rotulo} · {plural(validas, "retirada")}
            </p>
          </div>
          <Button asChild variant="secondary" className="self-start sm:self-auto">
            <a href={`/gestor/historico/csv?${query}`} download>
              <Download aria-hidden />
              Exportar CSV
            </a>
          </Button>
        </div>

        <FormularioDeFiltros acao="/gestor/historico">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              name="busca"
              defaultValue={filtro.busca}
              placeholder="Buscar por aluno, RM ou código"
              aria-label="Buscar por aluno, RM ou código"
              className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-label font-normal placeholder:text-disabled focus:border-accent focus:outline-none"
            />
          </div>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <select name="periodo" defaultValue={filtro.periodo} aria-label="Período" className={seletor}>
              {PERIODOS_HISTORICO.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Layers className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <select name="categoria" defaultValue={filtro.categoriaId ?? ""} aria-label="Categoria" className={seletor}>
              <option value="">Todas as categorias</option>
              {catalogo.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </FormularioDeFiltros>

        {linhas.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface">
            <EmptyState icon={History} message="Nenhuma retirada com esses filtros." />
          </div>
        ) : (
          <>
            {/* celular: um cartão por retirada; desktop: a tabela */}
            <ul className="flex flex-col gap-3 lg:hidden">
              {linhas.map((l) => (
                <li key={l.id} className={cn("flex flex-col gap-3 rounded-xl border border-border bg-surface p-4", l.desfeita && "text-muted")}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <CategoryIcon icon={l.categoria.icone} className="size-4" />
                      <span className="flex flex-col">
                        <span className={cn("text-label", l.desfeita && "line-through")}>{l.categoria.nome}</span>
                        <span className="font-mono text-caption text-muted">{formatarCodigo(l.codigo)}</span>
                      </span>
                    </span>
                    {l.desfeita ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-caption text-muted">
                        <Undo2 className="size-4" aria-hidden />
                        Desfeita
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-caption text-retirado-text">
                        <CircleCheck className="size-4" aria-hidden />
                        Carteirinha conferida
                      </span>
                    )}
                  </div>
                  <p className="text-label font-normal">
                    Retirado por <span className="font-semibold">{l.nome}</span> · RM {l.rm}
                  </p>
                  <p className="text-caption text-muted">
                    <span className="tabular-nums">{formatarDataHoraCurta(l.retiradoEm)}</span> · {l.local.nome} · registrado por {l.registradoPor}
                  </p>
                </li>
              ))}
            </ul>
            <div className="overflow-hidden rounded-xl border border-border bg-surface max-lg:hidden">
              <table className="w-full text-left text-label font-normal">
                <thead className="border-b border-border text-caption tracking-wider text-muted uppercase">
                  <tr>
                    {["Item", "Retirado por", "Data e hora", "Local", "Registrado por", "Carteirinha"].map((t) => (
                      <th key={t} scope="col" className="px-5 py-3 font-medium">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linhas.map((l) => (
                    <tr key={l.id} className={cn("hover:bg-surface-elevated", l.desfeita && "text-muted")}>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <CategoryIcon icon={l.categoria.icone} className="size-4" />
                          <span className="flex flex-col">
                            <span className={cn(l.desfeita && "line-through")}>{l.categoria.nome}</span>
                            <span className="font-mono text-caption text-muted">{formatarCodigo(l.codigo)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex flex-col">
                          <span>{l.nome}</span>
                          <span className="text-caption text-muted">RM {l.rm}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 tabular-nums">{formatarDataHoraCurta(l.retiradoEm)}</td>
                      <td className="px-5 py-3">{l.local.nome}</td>
                      <td className="px-5 py-3">{l.registradoPor}</td>
                      <td className="px-5 py-3">
                        {l.desfeita ? (
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            <Undo2 className="size-4" aria-hidden />
                            Desfeita
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-retirado-text">
                            <CircleCheck className="size-4" aria-hidden />
                            Conferida
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ConteudoDesktop>
  );
}
