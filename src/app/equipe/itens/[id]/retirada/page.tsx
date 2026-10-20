import type { Metadata } from "next";
import { ConteudoRetirada } from "@/components/equipe/conteudos";
import { CartaoDePagina } from "@/components/equipe/cartao-de-pagina";

export const metadata: Metadata = { title: "Registrar retirada" };

/** E5 · Registrar retirada, quando o link é aberto direto (sem a lista por baixo). */
export default async function RetiradaPage({ params, searchParams }: PageProps<"/equipe/itens/[id]/retirada">) {
  const { id } = await params;
  const { pedido } = await searchParams;
  return (
    <CartaoDePagina titulo="Registrar retirada">
      <ConteudoRetirada id={id} pedido={typeof pedido === "string" ? pedido : undefined} modo="pagina" />
    </CartaoDePagina>
  );
}
