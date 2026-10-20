"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { desfazerRetirada } from "@/app/equipe/acoes";
import { Button } from "@/components/ui/button";
import { Modal, ModalClose, ModalContent, ModalFooter } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

/** E7 · Desfazer retirada, com confirmação. A retirada fica no histórico marcada como desfeita. */
export function BotaoDesfazer({ retiradaId, nome }: { retiradaId: string; nome: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const r = await desfazerRetirada(retiradaId);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      setAberto(false);
      toast.success("Retirada desfeita. O item voltou para a lista.");
      router.refresh();
    });
  }

  return (
    <Modal open={aberto} onOpenChange={setAberto}>
      <Button variant="ghost" size="sm" onClick={() => setAberto(true)}>
        <Undo2 aria-hidden />
        Desfazer retirada
      </Button>
      <ModalContent title="Desfazer retirada?" size="md">
        <p className="text-body text-muted">
          A retirada por <strong className="text-foreground">{nome}</strong> será marcada como desfeita e o item volta para a
          lista. O registro continua no histórico.
        </p>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="secondary" disabled={salvando}>
              Cancelar
            </Button>
          </ModalClose>
          <Button onClick={confirmar} loading={salvando}>
            Desfazer retirada
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
