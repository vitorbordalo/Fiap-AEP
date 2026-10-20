import { ArrowLeft } from "lucide-react";
import { LinkVoltar } from "./link-voltar";
import { MenuUsuario } from "./menu-usuario";

type TopoMobileProps = {
  titulo: string;
  /** Para onde voltar se não houver página anterior; sem ele, o título fica sem seta. */
  voltarPara?: string;
  usuario?: { nome: string; detalhe?: string };
  acao?: React.ReactNode;
};

/** Topo das telas mobile: voltar, título e menu do usuário. */
export function TopoMobile({ titulo, voltarPara, usuario, acao }: TopoMobileProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-1 bg-background/95 px-2 backdrop-blur">
      {voltarPara ? (
        <LinkVoltar fallback={voltarPara} aria-label="Voltar" className="grid size-12 place-items-center rounded-full hover:bg-surface-elevated">
          <ArrowLeft className="size-6" aria-hidden />
        </LinkVoltar>
      ) : (
        <span className="w-3" />
      )}
      <h1 className="flex-1 truncate text-title">{titulo}</h1>
      {acao}
      {usuario && <MenuUsuario nome={usuario.nome} detalhe={usuario.detalhe} variante="compacto" />}
    </header>
  );
}

/** Área fixa no rodapé para o botão principal das telas mobile. */
export function RodapeFixo({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 mt-auto flex flex-col gap-2 bg-linear-to-t from-background from-70% to-transparent px-5 pt-6 pb-5">
      {children}
    </div>
  );
}
