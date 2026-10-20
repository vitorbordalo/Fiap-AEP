"use client";

import { useId } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses, describedBy, Field } from "./field";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<React.ComponentProps<"select">, "id" | "children"> & {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  id?: string;
};

/**
 * Lista de escolha sem digitação livre.
 * Usa o <select> nativo: no celular ele abre o seletor do sistema (folha inferior no iOS e no Android),
 * e no desktop funciona por teclado sem nenhum código extra.
 */
export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  icon: Icon,
  id,
  className,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <Field id={selectId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
        )}
        <select
          id={selectId}
          className={cn(controlClasses, "appearance-none pr-12 font-medium", Icon ? "pl-12" : "pl-4")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, { hint, error })}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </Field>
  );
}
