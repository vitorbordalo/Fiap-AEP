"use client";

import { useActionState } from "react";
import { Clock, DoorOpen, GraduationCap, Send } from "lucide-react";
import { RodapeFixo } from "@/components/layout/topo-mobile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Catalogo } from "@/lib/dados/tipos";
import { enviarPedido, type EstadoPedido } from "../../../acoes";

type FormularioPedidoProps = { itemId: string; catalogo: Catalogo };

/**
 * A5 · Os campos começam vazios de propósito: se viessem preenchidos com os dados do item,
 * a conferência da equipe na retirada perderia o sentido.
 */
export function FormularioPedido({ itemId, catalogo }: FormularioPedidoProps) {
  const [estado, acao, enviando] = useActionState<EstadoPedido, FormData>(enviarPedido, {});
  const campos = estado.campos ?? {};

  return (
    <form action={acao} className="flex flex-1 flex-col">
      <input type="hidden" name="itemId" value={itemId} />
      <div className="flex flex-col gap-5 px-5">
        <p className="text-body text-muted">Confirme onde e quando você perdeu o item.</p>
        <Select
          label="Sala onde você estava"
          name="salaId"
          icon={DoorOpen}
          placeholder="Escolha a sala"
          defaultValue=""
          options={catalogo.salas.map((s) => ({ value: s.id, label: s.nome }))}
          error={campos.salaId}
          required
        />
        <Select
          label="Sua turma"
          name="turmaId"
          icon={GraduationCap}
          placeholder="Escolha sua turma"
          defaultValue=""
          options={catalogo.turmas.map((t) => ({ value: t.id, label: t.nome }))}
          error={campos.turmaId}
          required
        />
        <Input label="Horário aproximado" name="horario" type="time" icon={Clock} error={campos.horario} required />
        <div className="flex flex-col gap-1">
          <Checkbox name="confirmo" label="Confirmo que este item é meu e vou apresentar minha carteirinha na retirada." required />
          {campos.confirmo && (
            <p className="text-caption text-danger" role="alert">
              {campos.confirmo}
            </p>
          )}
        </div>
        {estado.erro && !estado.campos && (
          <p className="text-label font-normal text-danger" role="alert">
            {estado.erro}
          </p>
        )}
      </div>

      <RodapeFixo>
        <Button type="submit" size="lg" fullWidth loading={enviando}>
          Enviar pedido
          {!enviando && <Send aria-hidden />}
        </Button>
      </RodapeFixo>
    </form>
  );
}
