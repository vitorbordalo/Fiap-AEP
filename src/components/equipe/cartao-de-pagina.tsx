/** Mesmo visual do modal, mas como página (para E5 e E6 abertos por link direto). */
export function CartaoDePagina({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-10">
      <section className="rounded-2xl border border-border bg-surface">
        <h1 className="border-b border-border px-8 py-6 text-title">{titulo}</h1>
        <div className="px-8 py-6">{children}</div>
      </section>
    </main>
  );
}
