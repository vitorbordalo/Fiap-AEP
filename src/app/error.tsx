"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

/** Erro inesperado em qualquer tela: mensagem curta, tentar de novo ou voltar ao início. */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5">
      <ErrorState
        message="Algo deu errado ao carregar esta tela. Tente de novo em alguns segundos."
        action={
          <div className="flex gap-3">
            <Button onClick={reset}>Tentar de novo</Button>
            <Button asChild variant="secondary">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </div>
        }
      />
      {error.digest && <p className="text-caption text-disabled">Código do erro: {error.digest}</p>}
    </main>
  );
}
