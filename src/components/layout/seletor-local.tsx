"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";
import type { Local } from "@/lib/dados/tipos";
import { cn } from "@/lib/utils";
import { escolherLocal } from "./acoes";

type SeletorLocalProps = {
  locais: Local[];
  /** null = todos os locais */
  atual: string | null;
};

/** Seletor de local no topo da equipe e do gestor. Muda só a visão, não o perfil. */
export function SeletorLocal({ locais, atual }: SeletorLocalProps) {
  const router = useRouter();
  const [trocando, iniciar] = useTransition();

  return (
    <div className={cn("relative min-w-0", trocando && "opacity-60")}>
      <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <select
        aria-label="Local exibido"
        value={atual ?? "todos"}
        disabled={trocando}
        onChange={(e) => {
          const valor = e.target.value;
          iniciar(async () => {
            await escolherLocal(valor);
            router.refresh();
          });
        }}
        className="h-10 w-full max-w-48 appearance-none truncate rounded-full lg:max-w-none border border-border bg-transparent pr-9 pl-9 text-label text-foreground hover:bg-surface-elevated focus:border-accent focus:outline-none"
      >
        <option value="todos">Todos os locais</option>
        {locais.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
