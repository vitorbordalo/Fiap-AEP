import { TopoDesktop } from "@/components/layout/topo-desktop";
import { TrocaDePerfil } from "@/components/layout/troca-de-perfil";
import { MODO_DEMO } from "@/lib/modo";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";

/** Área da equipe: topo da E2 em todas as telas e o slot @modal para E5 e E6 abrirem sobre a lista. */
export default async function EquipeLayout({ children, modal }: LayoutProps<"/equipe">) {
  const perfil = await exigirPapel("equipe");
  const { locais } = await dados().catalogo();
  const localAtual = await localDaVisao(perfil);
  const meuLocal = locais.find((l) => l.id === perfil.local_id);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopoDesktop
        inicio="/equipe"
        locais={locais}
        localAtual={localAtual}
        usuario={{ nome: perfil.nome || perfil.email, detalhe: meuLocal ? `Equipe · ${meuLocal.nome}` : "Equipe" }}
      />
      {children}
      {modal}
      {MODO_DEMO && <TrocaDePerfil papelAtual="equipe" compacto />}
    </div>
  );
}
