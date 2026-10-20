import { ConteudoRetirada } from "@/components/equipe/conteudos";
import { ModalRota } from "@/components/equipe/modal-rota";

/** E5 · Registrar retirada, como modal sobre a lista. */
export default async function RetiradaModal({ params, searchParams }: PageProps<"/equipe/itens/[id]/retirada">) {
  const { id } = await params;
  const { pedido } = await searchParams;
  return (
    <ModalRota titulo="Registrar retirada">
      <ConteudoRetirada id={id} pedido={typeof pedido === "string" ? pedido : undefined} modo="modal" />
    </ModalRota>
  );
}
