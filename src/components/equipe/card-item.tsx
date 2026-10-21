import Link from "next/link";
import { Clock, TriangleAlert } from "lucide-react";
import { FotoDoItem } from "@/components/itens/foto-do-item";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ItemEquipe } from "@/lib/dados/tipos";
import { quandoViraAguardando } from "@/lib/dominio/status";
import { diasDesde, formatarCodigo, formatarDataHoraCurta, formatarTempoNoLocal, plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

const DIAS_ALERTA = 30;

type CardItemProps = {
  item: ItemEquipe;
  diasParaAguardando: number;
  /** Mostra o status (útil na busca, que mistura listas). */
  mostrarStatus?: boolean;
};

/** Card de item das listas da equipe (E2, E3, E4). No celular, compacto: miniatura à esquerda e dados à direita. */
export function CardItem({ item, diasParaAguardando, mostrarStatus = false }: CardItemProps) {
  const detalhe = `/equipe/itens/${item.id}`;
  const [primeiroPedido, ...outrosPedidos] = item.pedidosPendentes;

  return (
    <article className="flex h-full overflow-hidden rounded-xl border border-border bg-surface sm:flex-col">
      <Link href={detalhe} tabIndex={-1} aria-hidden className="w-28 shrink-0 sm:w-auto">
        <FotoDoItem url={item.fotoUrl} categoria={item.categoria} comIcone className="h-full min-h-28 w-full sm:aspect-[16/10] sm:h-auto">
          {mostrarStatus && <StatusBadge status={item.status} className="absolute top-3 right-3 bg-black/70 max-sm:hidden" />}
        </FotoDoItem>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <Link href={detalhe} className="text-body font-semibold hover:underline">
            {item.categoria.nome}
          </Link>
          <span className="font-mono text-caption text-muted">{formatarCodigo(item.codigo)}</span>
        </div>
        {mostrarStatus && <StatusBadge status={item.status} className="self-start sm:hidden" />}

        {item.retirada ? (
          <>
            <p className="flex items-center gap-2 text-label font-normal">
              <span className="size-1.5 shrink-0 rounded-full bg-retirado" aria-hidden />
              Retirado por {item.retirada.nome} · RM {item.retirada.rm}
            </p>
            <p className="text-caption text-muted">
              {formatarDataHoraCurta(item.retirada.retiradoEm)} · registrado por {item.retirada.registradoPor.nome}
            </p>
          </>
        ) : (
          <>
            {primeiroPedido && (
              <p className="flex items-center gap-2 text-label text-aguardando-text">
                <span className="size-1.5 shrink-0 rounded-full bg-aguardando" aria-hidden />
                Pedido de {primeiroPedido.aluno.nome}
                {outrosPedidos.length > 0 && ` e mais ${outrosPedidos.length}`}
              </p>
            )}
            <p className="text-label font-normal text-muted">{[item.sala.nome, item.turma?.nome].filter(Boolean).join(" · ")}</p>
            <TempoNoLocal item={item} diasParaAguardando={diasParaAguardando} />
          </>
        )}

        <div className="mt-auto pt-2">
          {item.retirada ? (
            <Button asChild variant="secondary" size="sm" fullWidth>
              <Link href={detalhe}>Ver detalhes</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm" fullWidth>
              <Link href={`/equipe/itens/${item.id}/retirada`}>Registrar retirada</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function TempoNoLocal({ item, diasParaAguardando }: { item: ItemEquipe; diasParaAguardando: number }) {
  const dias = diasDesde(item.encontradoEm);

  if (item.status === "aguardando") {
    const alerta = dias >= DIAS_ALERTA;
    const Icone = alerta ? TriangleAlert : Clock;
    return (
      <p className={cn("flex items-center gap-2 text-label font-normal", alerta ? "text-danger" : "text-aguardando-text")}>
        <Icone className="size-4" aria-hidden />
        {plural(dias, "dia")} no local
      </p>
    );
  }

  const vira = quandoViraAguardando(item.encontradoEm, diasParaAguardando);
  return (
    <p className={cn("flex items-center gap-2 text-label font-normal", vira ? "text-aguardando-text" : "text-muted")}>
      <Clock className="size-4" aria-hidden />
      {formatarTempoNoLocal(item.encontradoEm)}
      {vira && ` · vai para Aguardando ${vira === "hoje" ? "hoje" : "amanhã"}`}
    </p>
  );
}
