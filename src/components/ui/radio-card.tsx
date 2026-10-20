import { CircleCheck, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type RadioCardProps = Omit<React.ComponentProps<"input">, "type"> & {
  titulo: string;
  descricao?: string;
  icone: React.ReactNode;
};

/** Opção grande de escolha única (ex.: onde o item vai ficar guardado). */
export function RadioCard({ titulo, descricao, icone, className, ...props }: RadioCardProps) {
  return (
    <label
      className={cn(
        "group relative flex min-h-24 cursor-pointer flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors",
        "has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-text",
        className,
      )}
    >
      <input type="radio" className="sr-only" {...props} />
      <div className="flex items-start justify-between">
        <span className="grid size-9 place-items-center rounded-lg bg-surface-elevated text-muted group-has-[:checked]:bg-accent/15 group-has-[:checked]:text-accent-text [&_svg]:size-5">
          {icone}
        </span>
        <Circle className="size-5 text-disabled group-has-[:checked]:hidden" aria-hidden />
        <CircleCheck className="hidden size-5 text-accent-text group-has-[:checked]:block" aria-hidden />
      </div>
      <span className="flex flex-col">
        <span className="text-label font-semibold">{titulo}</span>
        {descricao && <span className="text-caption text-muted">{descricao}</span>}
      </span>
    </label>
  );
}
