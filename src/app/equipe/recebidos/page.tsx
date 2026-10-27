import type { Metadata } from "next";
import { ListaDeItens } from "@/components/equipe/lista-de-itens";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { localDaVisao } from "@/lib/auth/local-visao";
import { exigirPapel } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Recebidos" };

/** E2 · Recebidos */
export default async function Page({ searchParams }: PageProps<"/equipe/recebidos">) {
  await exigirPapel("equipe");
  return (
    <ConteudoDesktop>
      <ListaDeItens status="recebido" localId={await localDaVisao()} params={await searchParams} />
    </ConteudoDesktop>
  );
}
