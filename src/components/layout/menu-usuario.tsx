"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { sair } from "@/app/auth/actions";
import { iniciais } from "@/lib/formato";
import { cn } from "@/lib/utils";

type MenuUsuarioProps = {
  nome: string;
  detalhe?: string;
  /** "compacto" = só o avatar (mobile); "completo" = avatar + nome (desktop). */
  variante?: "compacto" | "completo";
};

/** Avatar com menu para sair. Fecha com Esc ou clique fora. */
export function MenuUsuario({ nome, detalhe, variante = "completo" }: MenuUsuarioProps) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const fecharEsc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={variante === "compacto" ? `Menu de ${nome}` : undefined}
        className={cn(
          "flex items-center gap-2 rounded-full transition-colors hover:bg-surface-elevated",
          variante === "completo" ? "h-10 border border-border py-1 pr-4 pl-1" : "size-12 justify-center",
        )}
      >
        <span className="grid size-8 place-items-center rounded-full bg-accent/15 text-caption font-semibold text-accent-text">
          {iniciais(nome)}
        </span>
        {variante === "completo" && <span className="text-label">{nome}</span>}
      </button>

      {aberto && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-56 rounded-xl border border-border bg-surface-elevated p-2">
          <div className="px-3 py-2">
            <p className="truncate text-label">{nome}</p>
            {detalhe && <p className="truncate text-caption text-muted">{detalhe}</p>}
          </div>
          <form action={sair}>
            <button
              type="submit"
              role="menuitem"
              className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-label font-normal text-foreground hover:bg-border"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
