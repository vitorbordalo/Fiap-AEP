"use client";

import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses, describedBy, Field } from "./field";

type InputProps = Omit<React.ComponentProps<"input">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  aside?: React.ReactNode;
  id?: string;
};

export function Input({ label, hint, error, icon: Icon, aside, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Field id={inputId} label={label} hint={hint} error={error} aside={aside} className={className}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
        )}
        <input
          id={inputId}
          className={cn(controlClasses, Icon ? "pr-4 pl-12" : "px-4")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { hint, error })}
          {...props}
        />
      </div>
    </Field>
  );
}

type TextareaProps = Omit<React.ComponentProps<"textarea">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  aside?: React.ReactNode;
  id?: string;
};

export function Textarea({ label, hint, error, aside, id, className, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Field id={inputId} label={label} hint={hint} error={error} aside={aside} className={className}>
      <textarea
        id={inputId}
        className={cn(controlClasses, "h-auto min-h-24 resize-none px-4 py-3")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, { hint, error })}
        {...props}
      />
    </Field>
  );
}
