import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Check, CirclePlus, Hash, X } from "lucide-react";
import { FotoDoItem } from "@/components/itens/foto-do-item";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { formatarCodigo, formatarHora, formatarTempoNoLocal } from "@/lib/formato";

export const metadata: Metadata = { title: "Item cadastrado" };

/** M4 · Item cadastrado */
export default async function MonitorSucessoPage({ searchParams }: PageProps<"/monitor/novo/sucesso">) {
  const perfil = await exigirPapel("monitor");
  const { id } = await searchParams;
  if (typeof id !== "string") notFound();

  const item = await dados().obterItemCadastrado(perfil.id, id);
  if (!item) notFound();

  const quando = `${formatarTempoNoLocal(item.encontradoEm)} às ${formatarHora(item.encontradoEm)}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-mobile flex-col px-5 pb-6">
      <div className="h-1 rounded-full bg-retirado" aria-hidden />
      <header className="flex h-14 items-center justify-between">
        <span className="text-caption tracking-wider text-muted uppercase">Fluxo do monitor · Passo 3 de 3</span>
        <Link href="/monitor" aria-label="Fechar" className="-mr-2 grid size-12 place-items-center rounded-full hover:bg-surface-elevated">
          <X className="size-5" aria-hidden />
        </Link>
      </header>

      <section className="flex flex-col items-center gap-3 pt-6 text-center">
        <span className="grid size-28 place-items-center rounded-full bg-retirado/10">
          <span className="grid size-16 place-items-center rounded-full bg-retirado">
            <Check className="size-8 text-background" strokeWidth={3} aria-hidden />
          </span>
        </span>
        <h1 className="text-display" role="status">
          Item cadastrado!
        </h1>
        <p className="max-w-xs text-body text-muted">Os alunos já podem encontrar este item na busca.</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-3 py-1 text-caption text-muted">
          <Hash className="size-3" aria-hidden />
          Protocolo <strong className="text-foreground">{formatarCodigo(item.codigo)}</strong> · {quando}
        </span>
      </section>

      <div className="mt-8 flex gap-4 rounded-xl border border-border bg-surface p-3">
        <FotoDoItem url={item.fotoUrl} categoria={item.categoria} className="size-18 shrink-0 rounded-lg" miniatura />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-label font-semibold">{item.categoria.nome}</p>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-caption text-muted">
            {[item.sala.nome, item.turma?.nome, formatarHora(item.encontradoEm)].filter(Boolean).join(" · ")}
          </p>
          <p className="flex items-center gap-1.5 text-caption">
            <Archive className="size-3.5 text-muted" aria-hidden />
            Local: <strong className="font-semibold">{item.local.nome}</strong>
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Button asChild size="lg" fullWidth>
          <Link href="/monitor">
            <CirclePlus aria-hidden />
            Cadastrar outro item
          </Link>
        </Button>
      </div>
    </main>
  );
}
