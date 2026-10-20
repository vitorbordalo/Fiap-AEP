"use client";

import { useRouter } from "next/navigation";
import { Modal, ModalContent } from "@/components/ui/modal";

type ModalRotaProps = {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
};

/** Modal aberto por uma rota interceptada (E5, E6): fechar = voltar para a lista que estava embaixo. */
export function ModalRota({ titulo, descricao, children }: ModalRotaProps) {
  const router = useRouter();
  return (
    <Modal defaultOpen onOpenChange={(aberto) => !aberto && router.back()}>
      <ModalContent title={titulo} description={descricao}>
        {children}
      </ModalContent>
    </Modal>
  );
}
