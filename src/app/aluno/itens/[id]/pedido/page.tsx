import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DoorOpen } from "lucide-react";
import { FotoDoItem } from "@/components/itens/foto-do-item";
import { GuardadoBadge } from "@/components/itens/situacao-pedido";
import { TopoMobile } from "@/components/layout/topo-mobile";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { formatarCodigo, formatarDiaMes } from "@/lib/formato";
import { FormularioPedido } from "./formulario";

export const metadata: Metadata = { title: "Confirmar pedido" };

/** A5 · Confirmar pedido */
export default async function AlunoPedidoPage({ params }: PageProps<"/aluno/itens/[id]/pedido">) {
  const perfil = await exigirPapel("aluno");
  const { id } = await params;
  const item = await dados().obterItemPublico(id);
  if (!item) notFound();

  const existente = await dados().pedidoDoAluno(perfil.id, item.id);
  if (existente) redirect(`/aluno/pedidos/${existente}`);

  const catalogo = await dados().catalogo();

  return (
    <>
      <TopoMobile titulo="Confirmar pedido" voltarPara={`/aluno/itens/${item.id}`} />
      <div className="px-5 pb-5">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
          <FotoDoItem url={item.fotoUrl} categoria={item.categoria} className="size-16 shrink-0 rounded-lg" miniatura />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-label font-semibold">{item.categoria.nome}</p>
              <GuardadoBadge />
            </div>
            <p className="flex items-center gap-1.5 text-caption text-muted">
              <DoorOpen className="size-3.5" aria-hidden />
              {item.sala.nome} · {formatarDiaMes(item.encontradoEm)} · {formatarCodigo(item.codigo)}
            </p>
          </div>
        </div>
      </div>
      <FormularioPedido itemId={item.id} catalogo={catalogo} />
    </>
  );
}
