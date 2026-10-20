import { cva, type VariantProps } from "class-variance-authority";
import { STATUS_LABEL, type ItemStatus } from "@/lib/dominio/status";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        recebido: "bg-recebido/15 text-recebido-text",
        aguardando: "bg-aguardando/15 text-aguardando-text",
        retirado: "bg-retirado/15 text-retirado-text",
        neutro: "bg-surface-elevated text-muted",
      },
    },
    defaultVariants: { tone: "neutro" },
  },
);

const dotClasses: Record<NonNullable<VariantProps<typeof badgeVariants>["tone"]>, string> = {
  recebido: "bg-recebido",
  aguardando: "bg-aguardando",
  retirado: "bg-retirado",
  neutro: "bg-neutro",
};

type BadgeProps = VariantProps<typeof badgeVariants> & {
  children: React.ReactNode;
  className?: string;
};

/** Pílula com ponto colorido + texto (DESIGN.md). */
export function Badge({ tone = "neutro", children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      <span className={cn("size-1.5 rounded-full", dotClasses[tone ?? "neutro"])} aria-hidden />
      {children}
    </span>
  );
}

type StatusBadgeProps = {
  status: ItemStatus;
  /** Troca o texto mantendo a cor (ex.: alunos veem "Guardado" em vez de Recebido/Aguardando). */
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge tone={status} className={className}>
      {label ?? STATUS_LABEL[status]}
    </Badge>
  );
}
