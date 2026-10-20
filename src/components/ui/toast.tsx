"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { Toaster as Sonner, toast } from "sonner";

/**
 * Feedback de ação: mensagem curta com ícone de check (DESIGN.md).
 * Para oferecer "Desfazer": toast.success("Retirada registrada.", { action: { label: "Desfazer", onClick } }).
 */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      duration={5000}
      icons={{
        success: <CircleCheck className="size-5 text-retirado" aria-hidden />,
        error: <CircleAlert className="size-5 text-danger" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[calc(100vw-2.5rem)] max-w-[400px] items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 text-label text-foreground",
          title: "flex-1",
          description: "text-caption text-muted",
          actionButton:
            "h-9 shrink-0 rounded-lg px-3 text-label font-semibold text-accent-text hover:bg-border",
        },
      }}
    />
  );
}

export { toast };
