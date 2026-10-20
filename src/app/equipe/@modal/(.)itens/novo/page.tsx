import { ConteudoNovoItem } from "@/components/equipe/conteudos";
import { ModalRota } from "@/components/equipe/modal-rota";

/** E6 · Novo item, como modal sobre a lista. */
export default function NovoItemModal() {
  return (
    <ModalRota titulo="Novo item">
      <ConteudoNovoItem modo="modal" />
    </ModalRota>
  );
}
