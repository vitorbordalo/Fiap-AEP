"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.ComponentProps<"input">, "type" | "id"> & {
  label: React.ReactNode;
  /** "card" = caixa com fundo (ex.: "Conferi a carteirinha do aluno"). */
  variant?: "plain" | "card";
};

/** Checkbox com label clicável e área de toque de 48px. */
export function Checkbox({ label, variant = "plain", className, ...props }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-12 cursor-pointer items-start gap-3 select-none",
        variant === "card" && "items-center rounded-xl border border-border bg-surface-elevated px-4 py-3",
        className,
      )}
    >
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          className="peer size-5 appearance-none rounded-md border border-muted bg-surface transition-colors checked:border-accent checked:bg-accent"
          {...props}
        />
        <Check className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
      </span>
      <span className="text-label font-normal text-foreground">{label}</span>
    </label>
  );
}
