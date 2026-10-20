import { AbasGestor } from "@/components/gestor/abas";
import { TopoDesktop } from "@/components/layout/topo-desktop";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";

/** Área do gestor: topo com seletor de local e as abas Dashboard, Histórico e Configurações. */
export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  const perfil = await exigirPapel("gestor");
  const { locais } = await dados().catalogo();

  return (
    <div className="flex min-h-dvh flex-col">
      <TopoDesktop
        inicio="/gestor"
        locais={locais}
        localAtual={await localDaVisao(perfil)}
        usuario={{ nome: perfil.nome || perfil.email, detalhe: "Coordenação" }}
      >
        <div className="border-t border-border">
          <AbasGestor />
        </div>
      </TopoDesktop>
      {children}
    </div>
  );
}
