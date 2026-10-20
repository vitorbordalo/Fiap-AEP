import type { Metadata } from "next";
import { ListaDeItens } from "@/components/equipe/lista-de-itens";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Retirados" };

/** E4 · Retirados */
export default async function Page({ searchParams }: PageProps<"/equipe/retirados">) {
  const perfil = await exigirPapel("equipe");
  return (
    <ConteudoDesktop>
      <ListaDeItens status="retirado" localId={await localDaVisao(perfil)} params={await searchParams} />
    </ConteudoDesktop>
  );
}
