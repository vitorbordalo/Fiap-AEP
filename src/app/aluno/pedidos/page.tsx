import type { Metadata } from "next";
import Link from "next/link";
import { Archive } from "lucide-react";
import { ItemLinha } from "@/components/itens/item-linha";
import { SituacaoPedidoBadge } from "@/components/itens/situacao-pedido";
import { NavAluno } from "@/components/layout/nav-aluno";
import { TopoMobile } from "@/components/layout/topo-mobile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";

export const metadata: Metadata = { title: "Meus pedidos" };

/** Meus pedidos */
export default async function MeusPedidosPage() {
  const perfil = await exigirPapel("aluno");
  const pedidos = await dados().listarMeusPedidos(perfil.id);
  const abertos = pedidos.filter((p) => p.situacao === "pendente");
  const anteriores = pedidos.filter((p) => p.situacao !== "pendente");

  return (
    <>
      <TopoMobile titulo="Meus pedidos" usuario={{ nome: perfil.nome || perfil.email, detalhe: perfil.rm ? `RM ${perfil.rm}` : perfil.email }} />

      <div className="flex flex-1 flex-col gap-6 px-5 pb-6">
        {pedidos.length === 0 ? (
          <EmptyState
            icon={Archive}
            message="Você ainda não pediu nenhum item."
            action={
              <Button asChild variant="secondary">
                <Link href="/aluno">Buscar item</Link>
              </Button>
            }
          />
        ) : (
          [
            { titulo: "Em andamento", lista: abertos },
            { titulo: "Anteriores", lista: anteriores },
          ]
            .filter((grupo) => grupo.lista.length > 0)
            .map((grupo) => (
              <section key={grupo.titulo} className="flex flex-col gap-3">
                <h2 className="text-caption font-semibold tracking-wider text-muted uppercase">{grupo.titulo}</h2>
                <ul className="flex flex-col gap-3">
                  {grupo.lista.map((pedido) => (
                    <li key={pedido.id}>
                      <ItemLinha
                        item={pedido.item}
                        href={`/aluno/pedidos/${pedido.id}`}
                        badge={<SituacaoPedidoBadge situacao={pedido.situacao} />}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
        )}
      </div>
      <NavAluno />
    </>
  );
}
