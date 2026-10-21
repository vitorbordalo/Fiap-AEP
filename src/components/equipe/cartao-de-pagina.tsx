/** Mesmo visual do modal, mas como página (para E5 e E6 abertos por link direto). */
export function CartaoDePagina({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24 lg:px-8 lg:py-10">
      <section className="rounded-2xl border border-border bg-surface">
        <h1 className="border-b border-border px-5 py-5 text-title lg:px-8 lg:py-6">{titulo}</h1>
        <div className="px-5 py-5 lg:px-8 lg:py-6">{children}</div>
      </section>
    </main>
  );
}
