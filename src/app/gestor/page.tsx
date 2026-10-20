import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, BarChart3, Lightbulb, Minus, TriangleAlert } from "lucide-react";
import { GraficoBarras } from "@/components/gestor/grafico-barras";
import { MapaDeCalor } from "@/components/gestor/mapa-de-calor";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { EmptyState } from "@/components/ui/feedback";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados, type PeriodoRelatorio } from "@/lib/dados";
import { PERIODO_LABEL } from "@/lib/dominio/periodo";
import { plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const PERIODOS: { valor: PeriodoRelatorio; rotulo: string }[] = [
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "mes", rotulo: "Este mês" },
];

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const porcento = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

/** Abaixo disso, a variação percentual engana (1 item para 43 vira "+4.200%"). */
const MINIMO_PARA_COMPARAR = 5;

type Variacao = { texto: string; sentido: "bom" | "ruim" | "neutro"; direcao: "sobe" | "desce" | "igual" };

/** Seta + texto: a cor nunca carrega o significado sozinha. */
function TextoVariacao({ variacao }: { variacao: Variacao | null }) {
  if (!variacao) return <span className="text-caption text-muted">Sem período anterior para comparar</span>;
  const Icone = variacao.direcao === "sobe" ? ArrowUp : variacao.direcao === "desce" ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-caption",
        variacao.sentido === "bom" && "text-retirado-text",
        variacao.sentido === "ruim" && "text-aguardando-text",
        variacao.sentido === "neutro" && "text-muted",
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      {variacao.texto}
    </span>
  );
}

function variacao(atual: number, anterior: number, opcoes: { menorEhMelhor?: boolean; formato: (d: number) => string; neutra?: boolean }): Variacao {
  const diferenca = atual - anterior;
  const direcao = Math.abs(diferenca) < 1e-9 ? "igual" : diferenca > 0 ? "sobe" : "desce";
  const melhorou = opcoes.menorEhMelhor ? diferenca < 0 : diferenca > 0;
  return {
    texto: `${opcoes.formato(Math.abs(diferenca))} vs. período anterior`,
    direcao,
    sentido: opcoes.neutra || direcao === "igual" ? "neutro" : melhorou ? "bom" : "ruim",
  };
}

/** G1 · Dashboard da coordenação. */
export default async function GestorDashboardPage({ searchParams }: PageProps<"/gestor">) {
  const perfil = await exigirPapel("gestor");
  const { periodo: periodoParam } = await searchParams;
  const periodo: PeriodoRelatorio = PERIODOS.some((p) => p.valor === periodoParam) ? (periodoParam as PeriodoRelatorio) : "30d";
  const localId = await localDaVisao(perfil);
  const [painel, catalogo] = await Promise.all([dados().dashboard(localId, periodo), dados().catalogo()]);
  const { kpis } = painel;

  const cartoes = [
    {
      rotulo: "Itens cadastrados",
      valor: numero.format(kpis.cadastrados),
      variacao:
        kpis.cadastradosAnterior >= MINIMO_PARA_COMPARAR
          ? variacao(kpis.cadastrados, kpis.cadastradosAnterior, {
              formato: (d) => porcento.format(d / kpis.cadastradosAnterior),
              neutra: true,
            })
          : null,
    },
    {
      rotulo: "Taxa de devolução",
      valor: porcento.format(kpis.taxaDevolucao),
      variacao:
        kpis.cadastradosAnterior >= MINIMO_PARA_COMPARAR
          ? variacao(kpis.taxaDevolucao * 100, kpis.taxaDevolucaoAnterior * 100, { formato: (d) => `${numero.format(d)} p.p.` })
          : null,
    },
    {
      rotulo: "Tempo médio até a retirada",
      valor: kpis.tempoMedioRetirada === null ? "—" : `${numero.format(kpis.tempoMedioRetirada)} dias`,
      variacao:
        kpis.tempoMedioRetirada !== null && kpis.tempoMedioRetiradaAnterior !== null
          ? variacao(kpis.tempoMedioRetirada, kpis.tempoMedioRetiradaAnterior, {
              formato: (d) => `${numero.format(d)} dia`,
              menorEhMelhor: true,
            })
          : null,
    },
  ];

  const nomeDoLocal = catalogo.locais.find((l) => l.id === localId)?.nome ?? "Todos os locais";

  return (
    <ConteudoDesktop>
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-display">Dashboard</h1>
            <p className="text-body text-muted">
              {painel.periodo.rotulo} · {nomeDoLocal}
            </p>
          </div>
          <nav aria-label="Período" className="flex gap-1 rounded-full border border-border p-1">
            {PERIODOS.map((p) => (
              <Link
                key={p.valor}
                href={p.valor === "30d" ? "/gestor" : `/gestor?periodo=${p.valor}`}
                aria-current={periodo === p.valor ? "true" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-full px-4 text-label",
                  periodo === p.valor ? "bg-surface-elevated text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {p.rotulo}
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {cartoes.map((c) => (
            <div key={c.rotulo} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
              <p className="text-label font-normal text-muted">{c.rotulo}</p>
              <p className="text-kpi">{c.valor}</p>
              <TextoVariacao variacao={c.variacao} />
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <p className="text-label font-normal text-muted">Aguardando retirada agora</p>
            <p className="text-kpi">{kpis.aguardandoAgora}</p>
            {kpis.aguardandoAgora > 0 ? (
              <span className="flex items-center gap-1 text-caption text-aguardando-text">
                <TriangleAlert className="size-3.5" aria-hidden />
                Há mais de {plural(catalogo.diasParaAguardando, "dia")} no local
              </span>
            ) : (
              <span className="text-caption text-muted">Nenhum item parado</span>
            )}
          </div>
        </div>

        {painel.destaque && (
          <p className="flex items-center gap-4 rounded-xl border border-l-4 border-border border-l-accent bg-surface p-4 text-label font-normal">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-elevated">
              <Lightbulb className="size-5 text-accent-text" aria-hidden />
            </span>
            <span>
              <strong className="font-semibold">
                A {painel.destaque.sala} concentra {painel.destaque.percentual}% dos itens, principalmente à{" "}
                {PERIODO_LABEL[painel.destaque.periodo].toLowerCase()}.
              </strong>{" "}
              <span className="text-muted">Sugestão: lembrar a turma de conferir os pertences antes do fim da aula.</span>
            </span>
          </p>
        )}

        {kpis.cadastrados === 0 ? (
          <div className="rounded-xl border border-border bg-surface">
            <EmptyState icon={BarChart3} message="Nenhum item cadastrado neste período." />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5" aria-labelledby="por-sala">
                <div className="flex items-baseline justify-between">
                  <h2 id="por-sala" className="text-title">
                    Onde mais se perde
                  </h2>
                  <span className="text-caption text-muted">Itens por sala · 6 maiores</span>
                </div>
                <GraficoBarras
                  dados={painel.porSala}
                  descricao={`Itens por sala: ${painel.porSala.map((s) => `${s.nome}, ${s.total}`).join("; ")}`}
                />
              </section>
              <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5" aria-labelledby="por-categoria">
                <div className="flex items-baseline justify-between">
                  <h2 id="por-categoria" className="text-title">
                    O que mais se perde
                  </h2>
                  <span className="text-caption text-muted">Itens por categoria</span>
                </div>
                <GraficoBarras
                  dados={painel.porCategoria.map((c) => ({ nome: c.categoria.nome, total: c.total }))}
                  descricao={`Itens por categoria: ${painel.porCategoria.map((c) => `${c.categoria.nome}, ${c.total}`).join("; ")}`}
                />
              </section>
            </div>

            <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5" aria-labelledby="quando">
              <div className="flex items-baseline justify-between">
                <h2 id="quando" className="text-title">
                  Quando os itens são perdidos
                </h2>
                <span className="text-caption text-muted">Itens encontrados por dia e período</span>
              </div>
              <MapaDeCalor calor={painel.calor} />
            </section>
          </>
        )}
      </div>
    </ConteudoDesktop>
  );
}
