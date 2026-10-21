"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal acessível (foco preso, Esc fecha, scroll travado), sobre o Radix Dialog.
 * Uso: <Modal open onOpenChange={...}><ModalContent title="..."> ... <ModalFooter/></ModalContent></Modal>
 */
export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

type ModalContentProps = React.ComponentProps<typeof Dialog.Content> & {
  title: string;
  description?: string;
  /** Largura máxima do modal; o padrão serve para formulários de duas colunas no desktop. */
  size?: "md" | "lg";
};

export function ModalContent({ title, description, size = "lg", className, children, ...props }: ModalContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] lg:max-h-[calc(100dvh-4rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-surface outline-none",
          size === "md" ? "max-w-lg" : "max-w-3xl",
          className,
        )}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 lg:px-8 lg:py-6">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-title">{title}</Dialog.Title>
            {description && <Dialog.Description className="text-label font-normal text-muted">{description}</Dialog.Description>}
          </div>
          <Dialog.Close
            className="-mr-2 grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-elevated hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden />
          </Dialog.Close>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-8 lg:py-6">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

/** Rodapé fixo do modal: texto de apoio à esquerda, ações à direita (no celular, o texto em cima e os botões dividindo a largura). */
export function ModalFooter({ hint, children }: { hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <footer className="sticky -bottom-5 z-10 -mx-5 -mb-5 mt-6 flex flex-col gap-3 border-t border-border bg-surface px-5 py-4 lg:-bottom-6 lg:-mx-8 lg:-mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-8 lg:py-5">
      <p className="text-label font-normal text-muted empty:hidden">{hint}</p>
      <div className="flex gap-3 *:flex-1 lg:*:flex-none">{children}</div>
    </footer>
  );
}
