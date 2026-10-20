import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CircleCheck, Clock, DoorOpen, GraduationCap, Hourglass, IdCard, MapPin, Tag } from "lucide-react";
import { BotaoDesfazer } from "@/components/equipe/botao-desfazer";
import { FotoDoItem } from "@/components/itens/foto-do-item";
import { LinkVoltar } from "@/components/layout/link-voltar";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados, type EventoHistorico } from "@/lib/dados";
import { formatarCodigo, formatarDataHora, formatarDataHoraCurta, formatarDuracao, iniciais } from "@/lib/formato";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalhe do item" };

const LISTA = {
  recebido: { href: "/equipe/recebidos", rotulo: "Recebidos" },
  aguardando: { href: "/equipe/aguardando", rotulo: "Aguardando retirada" },
  retirado: { href: "/equipe/retirados", rotulo: "Retirados" },
};

const COR_EVENTO: Record<EventoHistorico["tipo"], string> = {
  cadastro: "bg-neutro",
  pedido: "bg-aguardando",
  retirada: "bg-retirado",
  desfeita: "bg-danger",
};

function Dado({ icone, rotulo, children }: { icone: React.ReactNode; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-caption text-muted [&_svg]:size-3.5">
        {icone}
        {rotulo}
      </dt>
      <dd className="text-label font-semibold">{children}</dd>
    </div>
  );
}

/** E7 · Detalhe do item: dados, retirada ou pedidos, histórico e "Desfazer retirada". */
export default async function EquipeItemPage({ params }: PageProps<"/equipe/itens/[id]">) {
  await exigirPapel("equipe");
  const { id } = await params;
  const item = await dados().obterItemDetalhe(id);
  if (!item) notFound();

  const lista = LISTA[item.status];
  const tempoNoLocal = formatarDuracao((item.retirada?.retiradoEm ?? new Date()).getTime() - item.encontradoEm.getTime());

  return (
    <ConteudoDesktop>
      <div className="flex flex-col gap-6">
        <LinkVoltar fallback={lista.href} className="inline-flex min-h-10 items-center gap-2 self-start text-label text-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {lista.rotulo}
        </LinkVoltar>

        <div className="flex items-center gap-4">
          <h1 className="text-display">{item.categoria.nome}</h1>
          <span className="font-mono text-body text-muted">{formatarCodigo(item.codigo)}</span>
          <StatusBadge status={item.status} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 flex flex-col gap-4">
            <FotoDoItem url={item.fotoUrl} categoria={item.categoria} comIcone className="aspect-[16/10] w-full rounded-xl">
              <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-caption">
                <DoorOpen className="size-3.5" aria-hidden />
                {item.sala.nome}
              </span>
            </FotoDoItem>

            <dl className="grid grid-cols-3 gap-x-6 gap-y-5 rounded-xl border border-border bg-surface p-5">
              <Dado icone={<Tag aria-hidden />} rotulo="Categoria">
                {item.categoria.nome}
              </Dado>
              <Dado icone={<DoorOpen aria-hidden />} rotulo="Sala">
                {item.sala.nome}
              </Dado>
              <Dado icone={<GraduationCap aria-hidden />} rotulo="Turma">
                {item.turma?.nome ?? "Não informada"}
              </Dado>
              <Dado icone={<CalendarClock aria-hidden />} rotulo="Encontrado em">
                {formatarDataHora(item.encontradoEm)}
              </Dado>
              <Dado icone={<MapPin aria-hidden />} rotulo="Local">
                {item.local.nome}
              </Dado>
              <Dado icone={<Hourglass aria-hidden />} rotulo={item.retirada ? "Tempo até a retirada" : "Tempo no local"}>
                {tempoNoLocal}
              </Dado>
            </dl>

            {item.observacao && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="text-caption text-muted">Observação do monitor</p>
                <p className="text-body">{item.observacao}</p>
              </div>
            )}
          </div>

          <div className="col-span-5 flex flex-col gap-4">
            {item.retirada ? (
              <section className="flex flex-col gap-4 rounded-xl border border-l-4 border-border border-l-retirado bg-surface p-5" aria-labelledby="retirada">
                <h2 id="retirada" className="text-caption tracking-wider text-muted uppercase">
                  Retirada
                </h2>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-surface-elevated text-label">{iniciais(item.retirada.nome)}</span>
                  <div>
                    <p className="text-title">{item.retirada.nome}</p>
                    <p className="text-caption text-muted">RM {item.retirada.rm}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 rounded-lg bg-background/40 p-4 text-label font-normal">
                  <li className="flex items-center gap-2">
                    <Clock className="size-4 text-muted" aria-hidden />
                    Retirado em {formatarDataHora(item.retirada.retiradoEm)}
                  </li>
                  <li className="flex items-center gap-2">
                    <IdCard className="size-4 text-muted" aria-hidden />
                    Registrado por <strong className="font-semibold">{item.retirada.registradoPor.nome}</strong>
                  </li>
                  <li className="flex items-center gap-2 text-retirado-text">
                    <CircleCheck className="size-4" aria-hidden />
                    Carteirinha conferida
                  </li>
                </ul>
              </section>
            ) : (
              <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5" aria-labelledby="pedidos">
                <h2 id="pedidos" className="text-caption tracking-wider text-muted uppercase">
                  {item.pedidosPendentes.length ? `Pedidos (${item.pedidosPendentes.length})` : "Pedidos"}
                </h2>
                {item.pedidosPendentes.length === 0 ? (
                  <p className="text-label font-normal text-muted">Nenhum aluno pediu este item ainda.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {item.pedidosPendentes.map((p) => (
                      <li key={p.id} className="flex flex-col gap-1 rounded-lg bg-background/40 p-3">
                        <p className="text-label">
                          {p.aluno.nome} {p.aluno.rm && <span className="font-normal text-muted">· RM {p.aluno.rm}</span>}
                        </p>
                        <p className="text-caption text-muted">
                          Informou {p.salaInformada.nome} · {p.turmaInformada.nome} · {p.horarioInformado} · pedido{" "}
                          {formatarDataHoraCurta(p.criadoEm)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild fullWidth>
                  <Link href={`/equipe/itens/${item.id}/retirada`}>Registrar retirada</Link>
                </Button>
              </section>
            )}

            <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5" aria-labelledby="historico">
              <h2 id="historico" className="text-caption tracking-wider text-muted uppercase">
                Histórico
              </h2>
              <ol className="flex flex-col">
                {item.historico.map((evento, indice) => (
                  <li key={`${evento.tipo}-${indice}`} className="relative flex gap-4 pb-5 last:pb-0">
                    {indice < item.historico.length - 1 && (
                      <span className="absolute top-3 left-[5px] h-full w-px bg-border" aria-hidden />
                    )}
                    <span className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full", COR_EVENTO[evento.tipo])} aria-hidden />
                    <div>
                      <p className="text-label">{evento.titulo}</p>
                      <p className="text-caption text-muted">
                        {formatarDataHoraCurta(evento.quando)}
                        {evento.detalhe && ` · ${evento.detalhe}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {item.retirada && (
              <div className="flex items-center justify-between">
                <BotaoDesfazer retiradaId={item.retirada.id} nome={item.retirada.nome} />
                <span className="text-caption text-disabled">Ação registrada no histórico</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </ConteudoDesktop>
  );
}
