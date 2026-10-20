import type { Metadata } from "next";
import { ListaDeItens } from "@/components/equipe/lista-de-itens";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Aguardando retirada" };

/** E3 · Aguardando retirada */
export default async function Page({ searchParams }: PageProps<"/equipe/aguardando">) {
  const perfil = await exigirPapel("equipe");
  return (
    <ConteudoDesktop>
      <ListaDeItens status="aguardando" localId={await localDaVisao(perfil)} params={await searchParams} />
    </ConteudoDesktop>
  );
}
