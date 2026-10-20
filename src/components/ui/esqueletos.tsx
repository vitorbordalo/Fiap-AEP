import { Skeleton } from "./feedback";

/** Esqueletos de carregamento com o mesmo formato das telas, para a página não "pular" ao carregar. */

export function EsqueletoListaMobile({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-3 px-5 pt-20" role="status" aria-label="Carregando">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-xl border border-border bg-surface p-3">
          <Skeleton className="size-18 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EsqueletoDetalheMobile() {
  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-5 px-5 pt-20" role="status" aria-label="Carregando">
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function EsqueletoGradeDesktop({ cartoes = 6 }: { cartoes?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8 pt-8" role="status" aria-label="Carregando">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: cartoes }, (_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EsqueletoPainelDesktop() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8 pt-8" role="status" aria-label="Carregando">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function EsqueletoTabelaDesktop({ linhas = 8 }: { linhas?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-8 pt-8" role="status" aria-label="Carregando">
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        {Array.from({ length: linhas }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
