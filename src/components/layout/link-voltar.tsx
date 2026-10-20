"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Vale só nesta aba e some no recarregamento: exatamente quando "voltar" ainda é uma página do app.
let navegouDentroDoApp = false;

/** Marca que houve navegação interna. Fica no layout raiz. */
export function RastreadorDeNavegacao() {
  const pathname = usePathname();
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    navegouDentroDoApp = true;
  }, [pathname]);
  return null;
}

type LinkVoltarProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  /** Destino quando não há página anterior do próprio app (ex.: link aberto direto). */
  fallback: string;
};

/** Volta para a página anterior (mantendo filtros e rolagem); sem histórico no app, vai para o fallback. */
export function LinkVoltar({ fallback, onClick, ...props }: LinkVoltarProps) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        onClick?.(e);
        if (navegouDentroDoApp) {
          e.preventDefault();
          router.back();
        }
      }}
      {...props}
    />
  );
}
