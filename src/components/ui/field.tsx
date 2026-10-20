import { cn } from "@/lib/utils";

/** Estilo compartilhado por Input e Select: fundo surface, borda de 1px, borda de destaque no foco. */
export const controlClasses =
  "h-12 w-full rounded-xl border border-border bg-surface text-body text-foreground placeholder:text-disabled transition-colors outline-none focus:border-accent disabled:cursor-not-allowed disabled:text-disabled aria-invalid:border-danger";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Texto à direita do label (ex.: contador "0/140"). */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** Label acima, controle e uma linha de ajuda ou erro abaixo. */
export function Field({ id, label, hint, error, aside, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-label text-muted">
          {label}
        </label>
        {aside && <span className="text-caption text-muted">{aside}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-erro`} className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-ajuda`} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Liga o controle à mensagem de ajuda ou de erro para leitores de tela. */
export function describedBy(id: string, { hint, error }: { hint?: string; error?: string }) {
  if (error) return `${id}-erro`;
  if (hint) return `${id}-ajuda`;
  return undefined;
}
