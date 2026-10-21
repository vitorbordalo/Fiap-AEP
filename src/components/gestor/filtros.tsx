"use client";

import { useRef } from "react";

/** Formulário GET que se envia sozinho ao trocar um select (a busca envia com Enter). */
export function FormularioDeFiltros({ acao, children }: { acao: string; children: React.ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      action={acao}
      role="search"
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) form.current?.requestSubmit();
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      {children}
    </form>
  );
}
