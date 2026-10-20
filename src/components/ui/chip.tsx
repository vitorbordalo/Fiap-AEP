import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const chipClasses =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-label whitespace-nowrap transition-colors [&_svg]:size-4 [&_svg]:shrink-0";

type ChipProps = Omit<React.ComponentProps<"button">, "type"> & {
  selected?: boolean;
  icon?: React.ReactNode;
};

/** Chip de filtro ou de escolha. Selecionado = fundo de destaque (DESIGN.md). */
export function Chip({ selected = false, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        chipClasses,
        // o pseudo-elemento estende a área de toque para 48px sem mudar o visual do chip
        "relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
        selected
          ? "bg-accent-fill font-semibold text-white"
          : "border border-border bg-surface text-muted hover:bg-surface-elevated hover:text-foreground",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

type RemovableChipProps = {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
  className?: string;
};

/** Chip de filtro aplicado, com botão para remover (ex.: resultados da busca). */
export function RemovableChip({ children, onRemove, removeLabel, className }: RemovableChipProps) {
  return (
    <span className={cn(chipClasses, "bg-surface-elevated pr-1 font-semibold text-foreground", className)}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="grid size-8 place-items-center rounded-full text-muted hover:bg-border hover:text-foreground"
      >
        <X aria-hidden />
      </button>
    </span>
  );
}
