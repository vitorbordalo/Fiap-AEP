import Link from "next/link";
import { ArrowLeft, PackageSearch, Plus, Search } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { dados, type PeriodoRelatorio } from "@/lib/dados";
import type { ItemStatus } from "@/lib/dominio/status";
import { plural } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { CardItem } from "./card-item";

type Parametros = { [chave: string]: string | string[] | undefined };

const TITULO: Record<ItemStatus, string> = {
  recebido: "Recebidos",
  aguardando: "Aguardando retirada",
  retirado: "Retirados",
};
const COR_PONTO: Record<ItemStatus, string> = {
  recebido: "bg-recebido",
  aguardando: "bg-aguardando",
  retirado: "bg-retirado",
};
const ORDEM: Record<ItemStatus, string> = {
  recebido: "Itens com pedido aparecem primeiro. Depois, os mais recentes.",
  aguardando: "Itens com pedido aparecem primeiro. Depois, do mais antigo para o mais novo.",
  retirado: "Mais recentes primeiro.",
};
const PERIODOS: { valor: PeriodoRelatorio; rotulo: string }[] = [
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "mes", rotulo: "Este mês" },
];

const texto = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

function chipClasses(ativo: boolean) {
  return cn(
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-label whitespace-nowrap transition-colors [&_svg]:size-4",
    ativo ? "bg-accent font-semibold text-white" : "border border-border text-muted hover:bg-surface-elevated hover:text-foreground",
  );
}

/** E2, E3, E4 · Lista de itens de um status, com busca e filtros na URL (dá para compartilhar o link). */
export async function ListaDeItens({ status, localId, params }: { status: ItemStatus; localId: string | null; params: Parametros }) {
  const catalogo = await dados().catalogo();
  const busca = texto(params.busca);
  const categoriaId = catalogo.categorias.some((c) => c.id === params.categoria) ? texto(params.categoria) : undefined;
  const soComPedido = status !== "retirado" && params.pedido === "1";
  const periodoParam = texto(params.periodo);
  const periodo: PeriodoRelatorio = PERIODOS.some((p) => p.valor === periodoParam) ? (periodoParam as PeriodoRelatorio) : "mes";

  const itens = await dados().listarItensEquipe({
    localId,
    status,
    busca,
    categoriaId,
    soComPedido,
    periodo: status === "retirado" ? periodo : undefined,
  });

  const caminho = { recebido: "/equipe/recebidos", aguardando: "/equipe/aguardando", retirado: "/equipe/retirados" }[status];
  const link = (mudancas: Record<string, string | undefined>) => {
    const novos = new URLSearchParams();
    const atuais = { busca, categoria: categoriaId, pedido: soComPedido ? "1" : undefined, periodo: status === "retirado" ? periodo : undefined };
    for (const [chave, valor] of Object.entries({ ...atuais, ...mudancas })) if (valor) novos.set(chave, valor);
    const query = novos.toString();
    return query ? `${caminho}?${query}` : caminho;
  };

  const n = catalogo.diasParaAguardando;
  const subtitulo = {
    recebido: `Até ${plural(n, "dia")} no local`,
    aguardando: `Há mais de ${plural(n, "dia")} no local`,
    retirado: PERIODOS.find((p) => p.valor === periodo)?.rotulo ?? "",
  }[status];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/equipe" className="inline-flex min-h-10 items-center gap-2 self-start text-label text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Itens
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-display">
            <span className={cn("size-3 rounded-full", COR_PONTO[status])} aria-hidden />
            {TITULO[status]}
          </h1>
          <p className="text-body text-muted">
            {subtitulo} · {plural(itens.length, "item", "itens")}
          </p>
        </div>
        <Button asChild>
          <Link href="/equipe/itens/novo">
            <Plus aria-hidden />
            Novo item
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <form action={caminho} className="relative w-80 shrink-0">
            {categoriaId && <input type="hidden" name="categoria" value={categoriaId} />}
            {soComPedido && <input type="hidden" name="pedido" value="1" />}
            {status === "retirado" && <input type="hidden" name="periodo" value={periodo} />}
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Buscar por código, item ou aluno"
              aria-label="Buscar por código, item ou aluno"
              className="h-10 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-label font-normal placeholder:text-disabled focus:border-accent focus:outline-none"
            />
          </form>

          <nav aria-label="Filtrar por categoria" className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] [scrollbar-width:none]">
            <Link href={link({ categoria: undefined })} className={chipClasses(!categoriaId)} aria-current={!categoriaId ? "true" : undefined}>
              Todos
            </Link>
            {catalogo.categorias.map((c) => (
              <Link
                key={c.id}
                href={link({ categoria: c.id })}
                className={chipClasses(categoriaId === c.id)}
                aria-current={categoriaId === c.id ? "true" : undefined}
              >
                <CategoryIcon icon={c.icone} className="text-current" />
                {c.nome}
              </Link>
            ))}
          </nav>

          <div className="h-8 w-px shrink-0 bg-border" aria-hidden />

          {status === "retirado" ? (
            <nav aria-label="Período" className="flex shrink-0 gap-1">
              {PERIODOS.map((p) => (
                <Link key={p.valor} href={link({ periodo: p.valor })} className={chipClasses(periodo === p.valor)} aria-current={periodo === p.valor ? "true" : undefined}>
                  {p.rotulo}
                </Link>
              ))}
            </nav>
          ) : (
            <Link href={link({ pedido: soComPedido ? undefined : "1" })} className={chipClasses(soComPedido)} aria-pressed={soComPedido}>
              <span className={cn("size-1.5 rounded-full", soComPedido ? "bg-white" : "bg-aguardando")} aria-hidden />
              Só com pedido
            </Link>
          )}
        </div>
        <p className="px-1 text-caption text-muted">{ORDEM[status]}</p>
      </div>

      {itens.length > 0 ? (
        <ul className="grid grid-cols-3 gap-6">
          {itens.map((item) => (
            <li key={item.id} className="flex">
              <div className="flex-1">
                <CardItem item={item} diasParaAguardando={n} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={PackageSearch}
          message={busca || categoriaId || soComPedido ? "Nenhum item com esses filtros." : `Nenhum item em ${TITULO[status]} agora.`}
          action={
            (busca || categoriaId || soComPedido) && (
              <Button asChild variant="secondary">
                <Link href={caminho}>Limpar filtros</Link>
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
