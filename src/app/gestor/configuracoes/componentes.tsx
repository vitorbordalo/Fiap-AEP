"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MapPin, Plus, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalClose, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import type { Local, PessoaEquipe } from "@/lib/dados/tipos";
import type { Papel } from "@/lib/supabase/database.types";
import { adicionarPessoa, alterarPessoa, salvarDias, type ResultadoConfig } from "./acoes";

const PAPEIS: { value: Papel; label: string }[] = [
  { value: "monitor", label: "Monitor" },
  { value: "equipe", label: "Equipe" },
  { value: "gestor", label: "Coordenação (gestor)" },
  { value: "aluno", label: "Aluno (sem acesso de funcionário)" },
];

function useAcao() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const executar = (acao: () => Promise<ResultadoConfig>, aoConcluir?: () => void) =>
    iniciar(async () => {
      const r = await acao();
      if (r.ok) {
        toast.success(r.mensagem);
        aoConcluir?.();
        router.refresh();
      } else {
        toast.error(r.erro);
      }
    });
  return { pendente, executar };
}

/** Regras de guarda: dias até Aguardando retirada. */
export function FormularioDias({ atual }: { atual: number }) {
  const [dias, setDias] = useState(String(atual));
  const { pendente, executar } = useAcao();
  const mudou = Number(dias) !== atual;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => salvarDias(dias));
      }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div>
        <label htmlFor="dias" className="text-label">
          Mover para Aguardando retirada após
        </label>
        <p className="text-caption text-muted">Itens com mais tempo no local aparecem em Aguardando retirada. A mudança vale na hora para todos.</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <input
          id="dias"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          className="h-12 w-20 rounded-xl border border-border bg-surface px-3 text-center text-body font-semibold focus:border-accent focus:outline-none"
        />
        <span className="text-body text-muted">dias</span>
        <Button type="submit" disabled={!mudou} loading={pendente}>
          Salvar
        </Button>
      </div>
    </form>
  );
}

function CamposPapel({
  papel,
  setPapel,
  localId,
  setLocalId,
  locais,
}: {
  papel: Papel;
  setPapel: (p: Papel) => void;
  localId: string;
  setLocalId: (l: string) => void;
  locais: Local[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select label="Perfil" icon={UserCog} value={papel} onChange={(e) => setPapel(e.target.value as Papel)} options={PAPEIS} />
      <Select
        label="Local (equipe)"
        icon={MapPin}
        value={papel === "equipe" ? localId : ""}
        onChange={(e) => setLocalId(e.target.value)}
        disabled={papel !== "equipe"}
        placeholder={papel === "equipe" ? "Escolha o local" : "Não se aplica"}
        options={locais.map((l) => ({ value: l.id, label: l.nome }))}
        hint={papel === "equipe" ? "Vê os itens deste local por padrão." : undefined}
      />
    </div>
  );
}

/** Editar o perfil de uma pessoa da lista. */
export function EditarPessoa({ pessoa, locais }: { pessoa: PessoaEquipe; locais: Local[] }) {
  const [aberto, setAberto] = useState(false);
  const [papel, setPapel] = useState<Papel>(pessoa.papel);
  const [localId, setLocalId] = useState(pessoa.local?.id ?? "");
  const { pendente, executar } = useAcao();

  return (
    <Modal open={aberto} onOpenChange={setAberto}>
      <Button variant="ghost" size="sm" onClick={() => setAberto(true)} aria-label={`Editar ${pessoa.nome}`}>
        Editar
      </Button>
      <ModalContent title={`Editar ${pessoa.nome}`} description={pessoa.email} size="md">
        <CamposPapel papel={papel} setPapel={setPapel} localId={localId} setLocalId={setLocalId} locais={locais} />
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </ModalClose>
          <Button loading={pendente} onClick={() => executar(() => alterarPessoa(pessoa.id, papel, localId), () => setAberto(false))}>
            Salvar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** Dar um perfil a alguém pelo e-mail institucional. */
export function AdicionarPessoa({ locais }: { locais: Local[] }) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("monitor");
  const [localId, setLocalId] = useState("");
  const { pendente, executar } = useAcao();

  return (
    <Modal open={aberto} onOpenChange={setAberto}>
      <Button variant="secondary" onClick={() => setAberto(true)} className="self-start">
        <Plus aria-hidden />
        Adicionar pessoa
      </Button>
      <ModalContent title="Adicionar pessoa" description="A pessoa entra com o e-mail institucional e já cai na área do perfil escolhido." size="md">
        <div className="flex flex-col gap-4">
          <Input label="E-mail institucional" type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@fiap.com.br" />
          <CamposPapel papel={papel} setPapel={setPapel} localId={localId} setLocalId={setLocalId} locais={locais} />
        </div>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </ModalClose>
          <Button
            loading={pendente}
            onClick={() =>
              executar(
                () => adicionarPessoa(email, papel, localId),
                () => {
                  setAberto(false);
                  setEmail("");
                },
              )
            }
          >
            Adicionar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
