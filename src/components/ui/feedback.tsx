import { CircleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bloco cinza pulsante para estados de carregamento. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-elevated", className)} aria-hidden />;
}

type EmptyStateProps = {
  icon: LucideIcon;
  /** Uma frase só (DESIGN.md: ícone simples, uma frase, uma ação). */
  message: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-full bg-surface-elevated">
        <Icon className="size-6 text-muted" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="max-w-xs text-body text-muted">{message}</p>
      {action}
    </div>
  );
}

/** Estado de erro de uma lista ou bloco, com ação de tentar de novo. */
export function ErrorState({ message, action, className }: Omit<EmptyStateProps, "icon">) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-4 px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-full bg-danger/10">
        <CircleAlert className="size-6 text-danger" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="max-w-xs text-body text-muted">{message}</p>
      {action}
    </div>
  );
}
