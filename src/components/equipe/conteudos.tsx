import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exigirPapel } from "@/lib/auth/sessao";
import { localDaVisao } from "@/lib/auth/local-visao";
import { dados } from "@/lib/dados";
import { sugerirLocal } from "@/lib/dominio/local";
import { dataHoraIso, formatarDataHora, horaLocal } from "@/lib/formato";
import { NovoItem } from "./novo-item";
import { RegistrarRetirada } from "./registrar-retirada";

const LISTA_DO_STATUS = { recebido: "/equipe/recebidos", aguardando: "/equipe/aguardando", retirado: "/equipe/retirados" };

/** Carrega e monta o E5, usado pela versão modal e pela página inteira. */
export async function ConteudoRetirada({ id, pedido, modo }: { id: string; pedido?: string; modo: "modal" | "pagina" }) {
  const perfil = await exigirPapel("equipe");
  const item = await dados().obterItemDetalhe(id);
  if (!item) notFound();

  if (item.retirada) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <CircleCheck className="size-10 text-retirado" aria-hidden />
        <p className="text-body">
          Este item já foi retirado por {item.retirada.nome} em {formatarDataHora(item.retirada.retiradoEm)}.
        </p>
        <Button asChild variant="secondary">
          <Link href={`/equipe/itens/${item.id}`}>Ver detalhes do item</Link>
        </Button>
      </div>
    );
  }

  const { salas, turmas } = await dados().catalogo();
  return (
    <RegistrarRetirada
      item={item}
      catalogo={{ salas, turmas }}
      funcionario={perfil.nome || perfil.email}
      agoraTexto={formatarDataHora(new Date())}
      pedidoInicial={pedido}
      modo={modo}
      listaDestino={LISTA_DO_STATUS[item.status]}
    />
  );
}

/** Carrega e monta o E6. O local sugerido é o que a equipe está vendo; em "todos", segue o horário. */
export async function ConteudoNovoItem({ modo }: { modo: "modal" | "pagina" }) {
  const perfil = await exigirPapel("equipe");
  const catalogo = await dados().catalogo();
  const agora = new Date();
  const localDaTela = await localDaVisao(perfil);

  return (
    <NovoItem
      catalogo={catalogo}
      agoraIso={dataHoraIso(agora)}
      localPadraoId={localDaTela ?? sugerirLocal(catalogo.locais, horaLocal(agora))}
      modo={modo}
    />
  );
}
