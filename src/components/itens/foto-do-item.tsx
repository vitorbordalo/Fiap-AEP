import { IdCard } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { Categoria } from "@/lib/dados/tipos";
import { cn } from "@/lib/utils";

type FotoDoItemProps = {
  /** null = foto oculta (categoria sensível vista por aluno). */
  url: string | null;
  categoria: Categoria;
  className?: string;
  /** Mostra o ícone da categoria no canto, como nos cards da equipe. */
  comIcone?: boolean;
  /** Versão miniatura (72px): sem o texto do placeholder. */
  miniatura?: boolean;
  children?: React.ReactNode;
};

/**
 * Foto do item. As URLs são de exemplo (public/seed), data URLs do modo demonstração
 * ou URLs assinadas do Storage, por isso <img> simples em vez de next/image.
 */
export function FotoDoItem({ url, categoria, className, comIcone = false, miniatura = false, children }: FotoDoItemProps) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-elevated", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Foto do item: ${categoria.nome}`} className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-center" role="img" aria-label="Foto oculta: documento">
          <IdCard className={cn("text-accent-text", miniatura ? "size-6" : "size-8")} strokeWidth={1.5} aria-hidden />
          {!miniatura && <span className="text-caption text-muted">Foto oculta · documento</span>}
        </div>
      )}
      {comIcone && (
        <CategoryIcon icon={categoria.icone} color={categoria.cor} variant="tile" className="absolute top-3 left-3" />
      )}
      {children}
    </div>
  );
}
