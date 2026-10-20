import type { Metadata } from "next";
import { CartaoDePagina } from "@/components/equipe/cartao-de-pagina";
import { ConteudoNovoItem } from "@/components/equipe/conteudos";

export const metadata: Metadata = { title: "Novo item" };

/** E6 · Novo item, quando o link é aberto direto (sem a lista por baixo). */
export default function NovoItemPage() {
  return (
    <CartaoDePagina titulo="Novo item">
      <ConteudoNovoItem modo="pagina" />
    </CartaoDePagina>
  );
}
