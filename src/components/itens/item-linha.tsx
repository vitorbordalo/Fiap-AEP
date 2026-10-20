import Link from "next/link";
import { MapPin } from "lucide-react";
import { FotoDoItem } from "./foto-do-item";
import type { ItemPublico } from "@/lib/dados/tipos";
import { formatarDiaMes, formatarHora } from "@/lib/formato";

type ItemLinhaProps = {
  item: ItemPublico;
  href: string;
  badge: React.ReactNode;
};

/** Card de item da lista do aluno (DESIGN.md): foto 72px à esquerda, categoria, sala e data, status à direita. */
export function ItemLinha({ item, href, badge }: ItemLinhaProps) {
  return (
    <Link
      href={href}
      className="flex gap-4 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-elevated"
    >
      <FotoDoItem url={item.fotoUrl} categoria={item.categoria} className="size-18 shrink-0 rounded-lg" miniatura />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-label font-semibold">{item.categoria.nome}</p>
          {badge}
        </div>
        <p className="text-caption text-muted">
          {item.sala.nome} · {formatarDiaMes(item.encontradoEm)} · {formatarHora(item.encontradoEm)}
        </p>
        <p className="flex items-center gap-1 text-caption text-muted">
          <MapPin className="size-3.5" aria-hidden />
          {item.local.nome}
        </p>
      </div>
    </Link>
  );
}
