import Link from "next/link";
import type { Local } from "@/lib/dados/tipos";
import { MenuUsuario } from "./menu-usuario";
import { SeletorLocal } from "./seletor-local";

type TopoDesktopProps = {
  inicio: string;
  locais: Local[];
  localAtual: string | null;
  usuario: { nome: string; detalhe: string };
  children?: React.ReactNode;
};

/**
 * Topo da equipe e do gestor (modelo da E2): logo à esquerda, local e usuário à direita, sem menu.
 * No celular, o logo fica só com o "F" e o usuário só com o avatar, para caber o seletor de local.
 */
export function TopoDesktop({ inicio, locais, localAtual, usuario, children }: TopoDesktopProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-desktop items-center justify-between gap-3 px-4 lg:gap-4 lg:px-8">
        <Link href={inicio} className="flex shrink-0 items-center gap-3 rounded-lg">
          <span className="grid size-9 place-items-center rounded-lg bg-accent-fill text-body font-bold text-white" aria-hidden>
            F
          </span>
          <span className="text-body font-semibold max-sm:sr-only">Achados e Perdidos</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          <SeletorLocal locais={locais} atual={localAtual} />
          <MenuUsuario nome={usuario.nome} detalhe={usuario.detalhe} />
        </div>
      </div>
      {children}
    </header>
  );
}

/** Container de conteúdo das telas desktop. */
export function ConteudoDesktop({ children, estreito = false }: { children: React.ReactNode; estreito?: boolean }) {
  return (
    <main className={`mx-auto w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-8 lg:pb-16 ${estreito ? "max-w-4xl" : "max-w-6xl"}`}>{children}</main>
  );
}
