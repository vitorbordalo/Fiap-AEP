"use client";

import { CategoryIcon } from "@/components/ui/category-icon";
import type { Categoria } from "@/lib/dados/tipos";
import { cn } from "@/lib/utils";

type EscolhaDeCategoriaProps = {
  categorias: Categoria[];
  valor: string | null;
  onChange: (id: string | null) => void;
  /** Toque de novo desmarca (filtros opcionais da busca). */
  permitirDesmarcar?: boolean;
  rotulo: string;
  className?: string;
};

/** Grupo de chips de escolha única para categoria, navegável por setas como um radio group. */
export function EscolhaDeCategoria({
  categorias,
  valor,
  onChange,
  permitirDesmarcar = false,
  rotulo,
  className,
}: EscolhaDeCategoriaProps) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={cn("flex flex-wrap gap-2", className)}>
      {categorias.map((c, indice) => {
        const marcado = valor === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={marcado}
            tabIndex={marcado || (!valor && indice === 0) ? 0 : -1}
            onClick={() => onChange(marcado && permitirDesmarcar ? null : c.id)}
            onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
              e.preventDefault();
              const passo = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
              const proxima = categorias[(indice + passo + categorias.length) % categorias.length];
              if (proxima) {
                onChange(proxima.id);
                const irmaos = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=radio]");
                irmaos?.[(indice + passo + categorias.length) % categorias.length]?.focus();
              }
            }}
            className={cn(
              "relative inline-flex h-10 items-center gap-2 rounded-full px-4 text-label whitespace-nowrap transition-colors",
              "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
              marcado
                ? "bg-accent-fill font-semibold text-white"
                : "border border-border bg-surface text-muted hover:bg-surface-elevated hover:text-foreground",
            )}
          >
            <CategoryIcon icon={c.icone} className="size-4 text-current" />
            {c.nome}
          </button>
        );
      })}
    </div>
  );
}
