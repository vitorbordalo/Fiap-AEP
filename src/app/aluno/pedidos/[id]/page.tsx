import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock, IdCard, MapPin } from "lucide-react";
import { EXPLICACAO_SITUACAO, SituacaoPedidoBadge } from "@/components/itens/situacao-pedido";
import { FotoDoItem } from "@/components/itens/foto-do-item";
import { RodapeFixo, TopoMobile } from "@/components/layout/topo-mobile";
import { Button } from "@/components/ui/button";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { formatarDiaMes, formatarDataHoraCurta } from "@/lib/formato";

export const metadata: Metadata = { title: "Pedido" };

function Linha({ icone, rotulo, valor }: { icone: React.ReactNode; rotulo: string; valor: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-border py-4 last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-elevated text-muted [&_svg]:size-5">{icone}</span>
      <div>
        <p className="text-caption tracking-wider text-muted uppercase">{rotulo}</p>
        <p className="text-body font-semibold">{valor}</p>
      </div>
    </div>
  );
}

/** A6 · Pedido enviado (logo depois do pedido) e detalhe de um pedido (a partir de Meus pedidos). */
export default async function AlunoPedidoDetalhePage({ params, searchParams }: PageProps<"/aluno/pedidos/[id]">) {
  const perfil = await exigirPapel("aluno");
  const { id } = await params;
  const { novo } = await searchParams;
  const pedido = await dados().obterMeuPedido(perfil.id, id);
  if (!pedido) notFound();

  const acabouDeEnviar = novo === "1" && pedido.situacao === "pendente";
  const { item } = pedido;

  return (
    <>
      <TopoMobile titulo={acabouDeEnviar ? "Pedido enviado" : "Seu pedido"} voltarPara="/aluno/pedidos" />

      <div className="flex flex-col gap-5 px-5">
        {acabouDeEnviar ? (
          <section className="flex flex-col items-center gap-3 pt-2 text-center" role="status">
            <span className="grid size-24 place-items-center rounded-full bg-retirado/10">
              <span className="grid size-14 place-items-center rounded-full bg-retirado">
                <Check className="size-7 text-background" strokeWidth={3} aria-hidden />
              </span>
            </span>
            <h2 className="text-display">Pedido enviado!</h2>
            <p className="max-w-xs text-body text-muted">Retire no {item.local.nome} com sua carteirinha.</p>
          </section>
        ) : (
          <section className="flex flex-col gap-2 pt-2">
            <SituacaoPedidoBadge situacao={pedido.situacao} />
            <p className="text-body text-muted">{EXPLICACAO_SITUACAO[pedido.situacao]}</p>
          </section>
        )}

        {pedido.situacao === "pendente" && (
          <div className="rounded-xl border border-border bg-surface px-4">
            <Linha icone={<MapPin aria-hidden />} rotulo="Onde retirar" valor={item.local.nome} />
            <Linha icone={<Clock aria-hidden />} rotulo="Horário de atendimento" valor={item.local.horarioRetirada} />
            <Linha icone={<IdCard aria-hidden />} rotulo="O que levar" valor="Carteirinha da FIAP" />
          </div>
        )}

        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
          <FotoDoItem url={item.fotoUrl} categoria={item.categoria} className="size-14 shrink-0 rounded-lg" miniatura />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-label font-semibold">{item.categoria.nome}</p>
            <p className="text-caption text-muted">
              {item.sala.nome} · {formatarDiaMes(item.encontradoEm)}
            </p>
          </div>
          <SituacaoPedidoBadge situacao={pedido.situacao} />
        </div>

        <p className="text-caption text-muted">
          Você informou: {pedido.salaInformada.nome} · {pedido.turmaInformada.nome} · por volta de {pedido.horarioInformado}.
          Pedido feito em {formatarDataHoraCurta(pedido.criadoEm)}.
        </p>
      </div>

      <RodapeFixo>
        <Button asChild size="lg" fullWidth>
          <Link href="/aluno/pedidos">
            Ver meus pedidos
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="ghost" fullWidth>
          <Link href="/aluno">Voltar ao início</Link>
        </Button>
      </RodapeFixo>
    </>
  );
}
