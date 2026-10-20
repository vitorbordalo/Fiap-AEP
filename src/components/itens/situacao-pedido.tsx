import { Badge } from "@/components/ui/badge";
import type { SituacaoPedido } from "@/lib/dados/tipos";

const ROTULO: Record<SituacaoPedido, string> = {
  pendente: "Pedido enviado",
  retirado: "Retirado",
  encerrado: "Encerrado",
};

const TOM = { pendente: "aguardando", retirado: "retirado", encerrado: "neutro" } as const;

export const EXPLICACAO_SITUACAO: Record<SituacaoPedido, string> = {
  pendente: "Retire no local indicado com sua carteirinha.",
  retirado: "Você já retirou este item.",
  encerrado: "Este item foi entregue a outra pessoa.",
};

/** Situação de um pedido do aluno (Meus pedidos, A6). */
export function SituacaoPedidoBadge({ situacao }: { situacao: SituacaoPedido }) {
  return <Badge tone={TOM[situacao]}>{ROTULO[situacao]}</Badge>;
}

/** Para o aluno, Recebido e Aguardando são a mesma coisa: o item está guardado. */
export function GuardadoBadge() {
  return <Badge tone="recebido">Guardado</Badge>;
}
