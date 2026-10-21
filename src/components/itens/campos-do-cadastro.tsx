"use client";

import { useEffect, useState } from "react";
import { CalendarClock, DoorOpen, GraduationCap, MapPin, Monitor } from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import { RadioCard } from "@/components/ui/radio-card";
import { Select } from "@/components/ui/select";
import type { Catalogo } from "@/lib/dados/tipos";
import { ehSalaDeTi } from "@/lib/dominio/local";
import { cn } from "@/lib/utils";
import { EscolhaDeCategoria } from "./escolha-de-categoria";

const CHAVE_ULTIMA_SALA = "ap:ultima-sala";

type CamposDoCadastroProps = {
  catalogo: Catalogo;
  /** Agora, no formato do datetime-local (vem do servidor para não divergir na hidratação). */
  agoraIso: string;
  localPadraoId: string;
  erros?: Partial<Record<string, string>>;
  layout: "mobile" | "desktop";
};

/**
 * Campos do cadastro de item (M3 e E6). Tudo por escolha, nada de digitação obrigatória:
 * categoria em chips, sala e turma em listas, data e hora já preenchidas, local em dois cartões.
 * A última sala usada fica lembrada neste aparelho, porque o monitor passa sala por sala.
 */
export function CamposDoCadastro({ catalogo, agoraIso, localPadraoId, erros = {}, layout }: CamposDoCadastroProps) {
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [salaId, setSalaId] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    try {
      const ultima = localStorage.getItem(CHAVE_ULTIMA_SALA);
      // lê o valor guardado no navegador uma vez, depois da hidratação
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (ultima && catalogo.salas.some((s) => s.id === ultima)) setSalaId(ultima);
    } catch {
      // armazenamento indisponível (aba anônima): segue sem lembrar
    }
  }, [catalogo.salas]);

  function escolherSala(id: string) {
    setSalaId(id);
    try {
      localStorage.setItem(CHAVE_ULTIMA_SALA, id);
    } catch {
      // ignora
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <legend className="text-label text-muted">Categoria do objeto</legend>
          {layout === "mobile" && <span className="text-caption text-disabled">Toque para selecionar</span>}
        </div>
        <input type="hidden" name="categoriaId" value={categoriaId ?? ""} />
        <EscolhaDeCategoria categorias={catalogo.categorias} valor={categoriaId} onChange={setCategoriaId} rotulo="Categoria do objeto" />
        {erros.categoriaId && (
          <p className="text-caption text-danger" role="alert">
            {erros.categoriaId}
          </p>
        )}
      </fieldset>

      <div className={cn("grid gap-3", layout === "desktop" ? "sm:grid-cols-2" : "grid-cols-2")}>
        <Select
          label={layout === "desktop" ? "Sala onde foi encontrado" : "Sala"}
          name="salaId"
          icon={layout === "desktop" ? DoorOpen : undefined}
          options={catalogo.salas.map((s) => ({ value: s.id, label: s.nome }))}
          placeholder="Escolha"
          value={salaId}
          onChange={(e) => escolherSala(e.target.value)}
          error={erros.salaId}
          required
        />
        <Select
          label="Turma (opcional)"
          name="turmaId"
          icon={layout === "desktop" ? GraduationCap : undefined}
          options={[{ value: "", label: "Sem turma" }, ...catalogo.turmas.map((t) => ({ value: t.id, label: t.nome }))]}
          defaultValue=""
        />
      </div>

      <Input
        label="Data e horário"
        name="encontradoEm"
        type="datetime-local"
        icon={CalendarClock}
        defaultValue={agoraIso}
        max={agoraIso}
        error={erros.encontradoEm}
        required
      />

      <Textarea
        label="Observação (opcional)"
        name="observacao"
        maxLength={140}
        rows={layout === "desktop" ? 2 : 3}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        aside={`${observacao.length}/140`}
        placeholder="Ex.: adesivo na tampa, capa preta"
        hint="Descreva o objeto. Não escreva nomes nem números de documentos."
        error={erros.observacao}
        className={cn(layout === "desktop" && "[&_textarea]:min-h-16")}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-label text-muted">Onde vai ficar guardado?</legend>
        <div className="grid grid-cols-2 gap-3">
          {catalogo.locais.map((local) => (
            <RadioCard
              key={local.id}
              name="localId"
              value={local.id}
              defaultChecked={local.id === localPadraoId}
              titulo={local.nome}
              descricao={layout === "desktop" ? local.horarioRetirada : undefined}
              icone={ehSalaDeTi(local) ? <Monitor aria-hidden /> : <MapPin aria-hidden />}
              required
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

