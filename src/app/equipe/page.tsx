import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox, Plus, Search } from "lucide-react";
import { CardItem } from "@/components/equipe/card-item";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/feedback";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { formatarCodigo, formatarRelativo, iniciais, plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Itens" };

/** E1 · Início da equipe: os três status, a busca geral e os pedidos de retirada abertos. */
export default async function EquipeInicioPage({ searchParams }: PageProps<"/equipe">) {
  const perfil = await exigirPapel("equipe");
  const localId = await localDaVisao(perfil);
  const { busca } = await searchParams;
  const termo = typeof busca === "string" ? busca.trim() : "";

  const [catalogo, resumo, resultados] = await Promise.all([
    dados().catalogo(),
    dados().resumoEquipe(localId),
    termo ? dados().listarItensEquipe({ localId, busca: termo }) : Promise.resolve([]),
  ]);
  const n = catalogo.diasParaAguardando;
  const nomeDoLocal = catalogo.locais.find((l) => l.id === localId)?.nome ?? "Todos os locais";

  const cartoes = [
    {
      href: "/equipe/recebidos",
      titulo: "Recebidos",
      ponto: "bg-recebido",
      total: resumo.recebidos.total,
      descricao: `Até ${plural(n, "dia")} no local`,
      comPedido: resumo.recebidos.comPedido,
    },
    {
      href: "/equipe/aguardando",
      titulo: "Aguardando retirada",
      ponto: "bg-aguardando",
      total: resumo.aguardando.total,
      descricao: `Há mais de ${plural(n, "dia")}`,
      comPedido: resumo.aguardando.comPedido,
    },
    {
      href: "/equipe/retirados",
      titulo: "Retirados",
      ponto: "bg-retirado",
      total: resumo.retiradosNoMes,
      descricao: "Este mês",
      comPedido: null,
    },
  ];

  return (
    <ConteudoDesktop>
      <div className="flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-display">Itens</h1>
            <p className="text-body text-muted">{nomeDoLocal}</p>
          </div>
          <Button asChild>
            <Link href="/equipe/itens/novo">
              <Plus aria-hidden />
              Novo item
            </Link>
          </Button>
        </div>

        <form action="/equipe" className="relative" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            name="busca"
            defaultValue={termo}
            placeholder="Buscar por código, item ou aluno"
            aria-label="Buscar por código, item ou aluno"
            className="h-12 w-full rounded-xl border border-border bg-surface pr-4 pl-12 text-body placeholder:text-disabled focus:border-accent focus:outline-none"
          />
        </form>

        {termo && (
          <section className="flex flex-col gap-4" aria-labelledby="resultados">
            <div className="flex items-center justify-between">
              <h2 id="resultados" className="text-title">
                {plural(resultados.length, "resultado")} para “{termo}”
              </h2>
              <Link href="/equipe" className="text-label text-accent-text hover:underline">
                Limpar busca
              </Link>
            </div>
            {resultados.length > 0 ? (
              <ul className="grid grid-cols-3 gap-6">
                {resultados.map((item) => (
                  <li key={item.id}>
                    <CardItem item={item} diasParaAguardando={n} mostrarStatus />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Search} message="Nenhum item encontrado. Confira o código ou o nome." />
            )}
          </section>
        )}

        <div className="grid grid-cols-3 gap-6">
          {cartoes.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 transition-colors hover:bg-surface-elevated"
            >
              <span className="flex items-center gap-2 text-label">
                <span className={cn("size-2 rounded-full", c.ponto)} aria-hidden />
                {c.titulo}
              </span>
              <span className="text-kpi">{c.total}</span>
              <span className="flex items-center justify-between gap-2">
                <span className="flex flex-col gap-2">
                  <span className="text-label font-normal text-muted">{c.descricao}</span>
                  {c.comPedido !== null && (
                    <span
                      className={cn(
                        "w-fit rounded-full px-2.5 py-0.5 text-caption",
                        c.comPedido > 0 ? "bg-aguardando/15 text-aguardando-text" : "bg-surface-elevated text-muted",
                      )}
                    >
                      {plural(c.comPedido, "com pedido", "com pedido")}
                    </span>
                  )}
                </span>
                <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </div>

        <section className="flex flex-col gap-4" aria-labelledby="pedidos">
          <div className="flex items-center gap-3">
            <h2 id="pedidos" className="text-title">
              Pedidos de retirada
            </h2>
            <span className="rounded-full bg-aguardando/15 px-2.5 py-0.5 text-caption font-semibold text-aguardando-text">
              {resumo.pedidosPendentes.length}
            </span>
          </div>

          {resumo.pedidosPendentes.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface">
              <EmptyState icon={Inbox} message="Nenhum pedido aberto. Quando um aluno disser “É meu”, ele aparece aqui." />
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {resumo.pedidosPendentes.map(({ pedido, item }) => (
                <li key={pedido.id} className="grid grid-cols-[1.4fr_1.2fr_0.8fr_auto] items-center gap-4 px-5 py-4">
                  <Link href={`/equipe/itens/${item.id}`} className="flex items-center gap-3 hover:underline">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-elevated">
                      <CategoryIcon icon={item.categoria.icone} color={item.categoria.cor} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-label">{item.categoria.nome}</span>
                      <span className="font-mono text-caption text-muted">{formatarCodigo(item.codigo)}</span>
                    </span>
                  </Link>
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-surface-elevated text-caption font-semibold">
                      {iniciais(pedido.aluno.nome)}
                    </span>
                    <span className="text-label font-normal">{pedido.aluno.nome}</span>
                  </span>
                  <span className="text-label font-normal text-muted">{formatarRelativo(pedido.criadoEm)}</span>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/equipe/itens/${item.id}/retirada?pedido=${pedido.id}`}>Registrar retirada</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ConteudoDesktop>
  );
}
