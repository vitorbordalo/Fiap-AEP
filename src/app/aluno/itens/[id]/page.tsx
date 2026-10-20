import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, CalendarClock, DoorOpen, Hand, Info, Lock, NotebookText, Tag } from "lucide-react";
import { LinkVoltar } from "@/components/layout/link-voltar";
import { FotoDoItem } from "@/components/itens/foto-do-item";
import { GuardadoBadge } from "@/components/itens/situacao-pedido";
import { RodapeFixo, TopoMobile } from "@/components/layout/topo-mobile";
import { Button } from "@/components/ui/button";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { formatarCodigo, formatarData, formatarHora } from "@/lib/formato";

export const metadata: Metadata = { title: "Detalhes do item" };

function Linha({ icone, rotulo, children }: { icone: React.ReactNode; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <dt className="flex items-center gap-3 text-label font-normal text-muted [&_svg]:size-5">
        {icone}
        {rotulo}
      </dt>
      <dd className="text-right text-label font-semibold">{children}</dd>
    </div>
  );
}

/** A4 · Detalhes do item */
export default async function AlunoItemPage({ params }: PageProps<"/aluno/itens/[id]">) {
  const perfil = await exigirPapel("aluno");
  const { id } = await params;
  const item = await dados().obterItemPublico(id);
  if (!item) notFound();
  const pedidoExistente = await dados().pedidoDoAluno(perfil.id, item.id);

  return (
    <>
      <TopoMobile titulo="Detalhes do item" voltarPara="/aluno/resultados" />

      <div className="flex flex-col gap-5 px-5">
        <FotoDoItem url={item.fotoUrl} categoria={item.categoria} className="aspect-[4/3] w-full rounded-xl" />

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-caption tracking-wider text-muted uppercase">Item {formatarCodigo(item.codigo)}</p>
            <h2 className="text-title">{item.categoria.nome}</h2>
          </div>
          <GuardadoBadge />
        </div>

        <dl className="rounded-xl border border-border bg-surface px-4">
          <Linha icone={<Tag aria-hidden />} rotulo="Categoria">
            {item.categoria.nome}
          </Linha>
          <Linha icone={<DoorOpen aria-hidden />} rotulo="Sala">
            {item.sala.nome}
          </Linha>
          <Linha icone={<CalendarClock aria-hidden />} rotulo="Encontrado em">
            {formatarData(item.encontradoEm)} às {formatarHora(item.encontradoEm)}
          </Linha>
          <Linha icone={<Archive aria-hidden />} rotulo="Local de guarda">
            <span className="inline-flex items-center gap-1.5 text-retirado-text">
              <Lock className="size-3.5" aria-hidden />
              {item.local.nome}
            </span>
          </Linha>
          {item.observacao && (
            <div className="flex flex-col gap-1 py-3">
              <dt className="flex items-center gap-3 text-label font-normal text-muted">
                <NotebookText className="size-5" aria-hidden />
                Observações do monitor
              </dt>
              <dd className="pl-8 text-body">{item.observacao}</dd>
            </div>
          )}
        </dl>

        <p className="flex gap-3 rounded-xl bg-surface-elevated p-4 text-label font-normal text-muted">
          <Info className="mt-0.5 size-5 shrink-0 text-recebido-text" aria-hidden />
          Para retirar, você confirma alguns dados e apresenta sua carteirinha no local.
        </p>
      </div>

      <RodapeFixo>
        {pedidoExistente ? (
          <Button asChild size="lg" fullWidth variant="secondary">
            <Link href={`/aluno/pedidos/${pedidoExistente}`}>Você já pediu este item · Ver pedido</Link>
          </Button>
        ) : (
          <Button asChild size="lg" fullWidth>
            <Link href={`/aluno/itens/${item.id}/pedido`}>
              <Hand aria-hidden />É meu
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" fullWidth>
          <LinkVoltar fallback="/aluno/resultados">Não é meu, voltar</LinkVoltar>
        </Button>
      </RodapeFixo>
    </>
  );
}
