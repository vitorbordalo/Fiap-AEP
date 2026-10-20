import Link from "next/link";

/** Provisória: a partir da Fase 2, a raiz redireciona cada perfil para a sua área. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-mobile flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-display">Achados e Perdidos FIAP</h1>
      <p className="text-body text-muted">Fundação do projeto pronta. As telas chegam nas próximas fases.</p>
      {process.env.NODE_ENV === "development" && (
        <Link href="/dev/componentes" className="text-label text-accent-text underline-offset-4 hover:underline">
          Ver componentes base
        </Link>
      )}
    </main>
  );
}
