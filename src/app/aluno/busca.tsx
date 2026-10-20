"use client";

import { useState } from "react";
import { CalendarDays, DoorOpen, Search } from "lucide-react";
import { EscolhaDeCategoria } from "@/components/itens/escolha-de-categoria";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Catalogo } from "@/lib/dados/tipos";
import { PERIODO_LABEL, PERIODOS, type PeriodoDoDia } from "@/lib/dominio/periodo";

type BuscaProps = { catalogo: Catalogo; hojeIso: string };

function Rotulo({ children, aside }: { children: React.ReactNode; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-caption font-semibold tracking-wider text-muted uppercase">{children}</span>
      {aside && <span className="text-caption text-muted">{aside}</span>}
    </div>
  );
}

/** A2 · Formulário de busca. Envia por GET para /aluno/resultados (o link dos resultados pode ser compartilhado). */
export function Busca({ catalogo, hojeIso }: BuscaProps) {
  const [data, setData] = useState(hojeIso);
  const [periodo, setPeriodo] = useState<PeriodoDoDia | null>(null);
  const [sala, setSala] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  function limpar() {
    setData("");
    setPeriodo(null);
    setSala("");
    setCategoria(null);
  }

  return (
    <form action="/aluno/resultados" method="get" className="flex flex-1 flex-col gap-6 px-5 pb-5">
      <section className="flex flex-col gap-3">
        <Rotulo>Quando você perdeu?</Rotulo>
        <Input
          label="Data"
          name="data"
          type="date"
          icon={CalendarDays}
          value={data}
          max={hojeIso}
          onChange={(e) => setData(e.target.value)}
          className="[&_label]:sr-only"
        />
        <input type="hidden" name="periodo" value={periodo ?? ""} />
        <div role="radiogroup" aria-label="Período do dia" className="grid grid-cols-3 gap-2">
          {PERIODOS.map((p) => (
            <Chip
              key={p}
              role="radio"
              aria-checked={periodo === p}
              aria-pressed={undefined}
              selected={periodo === p}
              onClick={() => setPeriodo(periodo === p ? null : p)}
              className="justify-center"
            >
              {PERIODO_LABEL[p]}
            </Chip>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Rotulo>Onde?</Rotulo>
        <Select
          label="Sala"
          name="sala"
          icon={DoorOpen}
          value={sala}
          onChange={(e) => setSala(e.target.value)}
          options={[{ value: "", label: "Qualquer sala" }, ...catalogo.salas.map((s) => ({ value: s.id, label: s.nome }))]}
          className="[&_label]:sr-only"
        />
      </section>

      <section className="flex flex-col gap-3">
        <Rotulo aside="Opcional">O que era?</Rotulo>
        <input type="hidden" name="categoria" value={categoria ?? ""} />
        <EscolhaDeCategoria
          categorias={catalogo.categorias}
          valor={categoria}
          onChange={setCategoria}
          permitirDesmarcar
          rotulo="O que era?"
        />
      </section>

      <div className="sticky bottom-16 z-10 -mx-5 mt-auto flex flex-col gap-2 bg-linear-to-t from-background from-80% to-transparent px-5 pt-6 pb-3">
        <Button type="button" variant="ghost" onClick={limpar}>
          Limpar filtros
        </Button>
        <Button type="submit" size="lg" fullWidth>
          <Search aria-hidden />
          Buscar itens
        </Button>
      </div>
    </form>
  );
}
