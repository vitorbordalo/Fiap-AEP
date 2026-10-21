"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, DoorOpen, GraduationCap, X } from "lucide-react";
import { desfazerRetirada, registrarRetirada } from "@/app/equipe/acoes";
import { FotoDoItem } from "@/components/itens/foto-do-item";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ModalFooter } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import type { Catalogo, ItemEquipe } from "@/lib/dados/tipos";
import { conferir } from "@/lib/dominio/conferencia";
import { formatarCodigo, formatarDataHoraCurta, formatarHora } from "@/lib/formato";
import { cn } from "@/lib/utils";

const BALCAO = "balcao";

type RegistrarRetiradaProps = {
  item: ItemEquipe;
  catalogo: Pick<Catalogo, "salas" | "turmas">;
  funcionario: string;
  /** "Registrado por ... · data e hora", formatado no servidor. */
  agoraTexto: string;
  pedidoInicial?: string;
  /** "modal" fecha voltando para a lista; "pagina" navega para a lista indicada. */
  modo: "modal" | "pagina";
  listaDestino: string;
};

/** E5 · Registrar retirada (com pedido ou com o aluno direto no balcão). */
export function RegistrarRetirada({
  item,
  catalogo,
  funcionario,
  agoraTexto,
  pedidoInicial,
  modo,
  listaDestino,
}: RegistrarRetiradaProps) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const pedidos = item.pedidosPendentes;

  const [origem, setOrigem] = useState(
    pedidos.some((p) => p.id === pedidoInicial) ? (pedidoInicial as string) : (pedidos[0]?.id ?? BALCAO),
  );
  const pedido = pedidos.find((p) => p.id === origem) ?? null;

  const [balcao, setBalcao] = useState({ salaId: "", turmaId: "", horario: "" });
  const [rm, setRm] = useState(pedido?.aluno.rm ?? "");
  const [nome, setNome] = useState(pedido?.aluno.nome ?? "");
  const [carteirinha, setCarteirinha] = useState(false);

  function escolherOrigem(nova: string) {
    setOrigem(nova);
    const novoPedido = pedidos.find((p) => p.id === nova);
    setRm(novoPedido?.aluno.rm ?? "");
    setNome(novoPedido?.aluno.nome ?? "");
    setCarteirinha(false);
  }

  const informado = pedido
    ? { salaId: pedido.salaInformada.id, turmaId: pedido.turmaInformada.id, horario: pedido.horarioInformado }
    : { salaId: balcao.salaId || null, turmaId: balcao.turmaId || null, horario: balcao.horario || null };

  const resultado = conferir(
    { salaId: item.sala.id, turmaId: item.turma?.id ?? null, encontradoEm: item.encontradoEm },
    informado,
  );

  const nomeDe = (lista: { id: string; nome: string }[], id: string | null) => lista.find((x) => x.id === id)?.nome ?? null;
  const linhas = [
    { campo: "Sala", cadastro: item.sala.nome, informado: nomeDe(catalogo.salas, informado.salaId), bate: resultado.sala },
    { campo: "Turma", cadastro: item.turma?.nome ?? "Não informada", informado: nomeDe(catalogo.turmas, informado.turmaId), bate: resultado.turma },
    { campo: "Horário", cadastro: formatarHora(item.encontradoEm), informado: informado.horario, bate: resultado.horario },
  ];
  const preencheuBalcao = Boolean(pedido || informado.salaId || informado.turmaId || informado.horario);

  const rmValido = /^\d{4,10}$/.test(rm.trim());
  const nomeValido = nome.trim().length >= 3;
  const podeConfirmar = carteirinha && rmValido && nomeValido && !salvando;

  function fechar() {
    if (modo === "modal") router.back();
    else router.push(listaDestino);
  }

  function confirmar() {
    iniciar(async () => {
      const r = await registrarRetirada({
        itemId: item.id,
        pedidoId: pedido?.id ?? null,
        rm: rm.trim(),
        nome: nome.trim(),
        carteirinhaConferida: carteirinha as true,
      });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(`Retirada registrada: ${item.categoria.nome} ${formatarCodigo(item.codigo)}.`, {
        action: {
          label: "Desfazer",
          onClick: async () => {
            const desfeita = await desfazerRetirada(r.retiradaId);
            if (desfeita.ok) toast("Retirada desfeita. O item voltou para a lista.");
            else toast.error(desfeita.erro);
            router.refresh();
          },
        },
      });
      fechar();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 rounded-xl border border-border bg-background/40 p-3 sm:gap-5 sm:p-4">
        <FotoDoItem url={item.fotoUrl} categoria={item.categoria} comIcone className="aspect-[4/3] w-24 shrink-0 rounded-lg sm:w-44" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div>
              <p className="text-title">{item.categoria.nome}</p>
              <p className="text-label font-normal text-muted">
                {[item.sala.nome, item.turma?.nome, formatarDataHoraCurta(item.encontradoEm)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="rounded-md bg-surface-elevated px-2 py-1 font-mono text-caption">{formatarCodigo(item.codigo)}</span>
          </div>
          {item.observacao && (
            <p className="border-t border-border pt-2 text-label font-normal text-muted">
              Nota do monitor: <em className="text-foreground">“{item.observacao}”</em>
            </p>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="quem-pediu">
        <h3 id="quem-pediu" className="text-label font-semibold">
          {pedidos.length > 1 ? `Entregar para (${pedidos.length} pedidos para este item)` : "Entregar para"}
        </h3>
        <div role="radiogroup" aria-labelledby="quem-pediu" className="flex flex-wrap gap-2">
          {[...pedidos.map((p) => ({ id: p.id, rotulo: `Pedido de ${p.aluno.nome}` })), { id: BALCAO, rotulo: "Sem pedido (aluno no balcão)" }].map(
            (opcao) => (
              <button
                key={opcao.id}
                type="button"
                role="radio"
                aria-checked={origem === opcao.id}
                onClick={() => escolherOrigem(opcao.id)}
                className={cn(
                  "h-10 rounded-full px-4 text-label transition-colors",
                  origem === opcao.id
                    ? "bg-accent-fill font-semibold text-white"
                    : "border border-border text-muted hover:bg-surface-elevated hover:text-foreground",
                )}
              >
                {opcao.rotulo}
              </button>
            ),
          )}
        </div>
      </section>

      {!pedido && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Sala que o aluno informou"
            icon={DoorOpen}
            placeholder="Escolha"
            value={balcao.salaId}
            onChange={(e) => setBalcao((b) => ({ ...b, salaId: e.target.value }))}
            options={catalogo.salas.map((s) => ({ value: s.id, label: s.nome }))}
          />
          <Select
            label="Turma"
            icon={GraduationCap}
            placeholder="Escolha"
            value={balcao.turmaId}
            onChange={(e) => setBalcao((b) => ({ ...b, turmaId: e.target.value }))}
            options={catalogo.turmas.map((t) => ({ value: t.id, label: t.nome }))}
          />
          <Input
            label="Horário aproximado"
            type="time"
            icon={Clock}
            value={balcao.horario}
            onChange={(e) => setBalcao((b) => ({ ...b, horario: e.target.value }))}
          />
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="conferencia">
        <div>
          <h3 id="conferencia" className="text-label font-semibold">
            Conferência
          </h3>
          <p className="text-label font-normal text-muted">
            {pedido ? "Compare com o que o aluno informou no pedido." : "Pergunte ao aluno e compare com o cadastro."}
          </p>
        </div>
        <table className="w-full overflow-hidden rounded-xl border border-border text-left text-label font-normal">
          <thead className="bg-surface-elevated text-muted">
            <tr>
              <th scope="col" className="px-3 py-3 font-normal sm:px-4">Campo</th>
              <th scope="col" className="px-3 py-3 font-normal sm:px-4">Cadastro</th>
              <th scope="col" className="px-3 py-3 font-normal sm:px-4">{pedido ? "Informado pelo aluno" : "Informado no balcão"}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.campo} className="border-t border-border">
                <th scope="row" className="px-3 py-3 font-normal text-muted sm:px-4">{l.campo}</th>
                <td className="px-3 py-3 sm:px-4">{l.cadastro}</td>
                <td className="px-3 py-3 sm:px-4">
                  {l.informado ? (
                    <span className={cn("inline-flex items-center gap-2", l.bate === true && "text-retirado-text", l.bate === false && "text-aguardando-text")}>
                      {l.informado}
                      {l.bate === true && <Check className="size-4" aria-label="confere" />}
                      {l.bate === false && <X className="size-4" aria-label="não confere" />}
                    </span>
                  ) : (
                    <span className="text-disabled">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {preencheuBalcao && (
          <p className={cn("flex items-center gap-2 text-label font-normal", resultado.confere ? "text-retirado-text" : "text-aguardando-text")} role="status">
            {resultado.confere ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
            {resultado.confere ? "Os dados conferem." : "Há diferenças. Confira com o aluno antes de entregar."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="quem-retira">
        <h3 id="quem-retira" className="text-label font-semibold">
          Quem está retirando
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="RM"
            inputMode="numeric"
            autoComplete="off"
            value={rm}
            onChange={(e) => setRm(e.target.value.replace(/\D/g, ""))}
            error={rm && !rmValido ? "RM tem de 4 a 10 números." : undefined}
          />
          <Input label="Nome completo" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <Checkbox
          variant="card"
          label="Conferi a carteirinha do aluno"
          checked={carteirinha}
          onChange={(e) => setCarteirinha(e.target.checked)}
        />
        <p className="flex items-center gap-2 text-label font-normal text-muted">
          <Clock className="size-4" aria-hidden />
          Registrado por {funcionario} · {agoraTexto}
        </p>
      </section>

      <ModalFooter hint={!carteirinha ? "Confira a carteirinha para continuar" : !rmValido || !nomeValido ? "Preencha RM e nome" : undefined}>
        <Button variant="secondary" onClick={fechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={!podeConfirmar} loading={salvando}>
          Confirmar retirada
        </Button>
      </ModalFooter>
    </div>
  );
}
