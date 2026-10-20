import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import usuariosTeste from "@scripts/seed/usuarios-teste.json";
import { Badge } from "@/components/ui/badge";
import { entrarComo } from "./actions";

export const metadata: Metadata = { title: "Entrar como" };

/** Atalho de desenvolvimento para entrar como cada perfil de teste. Não existe em produção. */
export default function DevEntrarPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-mobile flex-col justify-center gap-6 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Badge tone="aguardando" className="self-start">
          Só em desenvolvimento
        </Badge>
        <h1 className="text-display">Entrar como</h1>
        <p className="text-body text-muted">Escolha um perfil de teste. Os dados são fictícios, criados pelo seed.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {usuariosTeste.map((usuario) => (
          <li key={usuario.email}>
            <form action={entrarComo}>
              <input type="hidden" name="email" value={usuario.email} />
              <button
                type="submit"
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-elevated"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-label font-semibold capitalize">{usuario.role}</span>
                  <span className="text-caption text-muted">{usuario.descricao}</span>
                  <span className="truncate text-caption text-disabled">{usuario.email}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
