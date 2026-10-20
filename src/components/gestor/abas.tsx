"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ABAS = [
  { href: "/gestor", rotulo: "Dashboard" },
  { href: "/gestor/historico", rotulo: "Histórico" },
  { href: "/gestor/configuracoes", rotulo: "Configurações" },
];

/** As três abas do gestor. É a única navegação da área (sem menu lateral). */
export function AbasGestor() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções da coordenação" className="mx-auto flex max-w-desktop gap-6 px-8">
      {ABAS.map((aba) => {
        const ativa = aba.href === "/gestor" ? pathname === "/gestor" : pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "-mb-px flex h-12 items-center border-b-2 text-label",
              ativa ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
