"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ABAS = [
  { href: "/aluno", rotulo: "Buscar", icone: Search, ativa: (p: string) => p === "/aluno" || p.startsWith("/aluno/resultados") },
  { href: "/aluno/pedidos", rotulo: "Meus pedidos", icone: Archive, ativa: (p: string) => p.startsWith("/aluno/pedidos") },
];

/** Navegação inferior do aluno: Buscar e Meus pedidos. */
export function NavAluno() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação do aluno" className="sticky bottom-0 z-20 mt-auto grid grid-cols-2 border-t border-border bg-surface">
      {ABAS.map(({ href, rotulo, icone: Icone, ativa }) => {
        const atual = ativa(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={atual ? "page" : undefined}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-caption",
              atual ? "text-accent-text" : "text-muted hover:text-foreground",
            )}
          >
            <Icone className="size-6" strokeWidth={1.5} aria-hidden />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
