"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirPapelNaAcao } from "@/lib/auth/sessao";
import { dados, ErroDeNegocio } from "@/lib/dados";

const esquemaPedido = z.object({
  itemId: z.string().min(1),
  salaId: z.string({ error: "Escolha a sala." }).min(1, { error: "Escolha a sala." }),
  turmaId: z.string({ error: "Escolha sua turma." }).min(1, { error: "Escolha sua turma." }),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Informe o horário aproximado." }),
  confirmo: z.literal("on", { error: "Confirme que vai apresentar sua carteirinha." }),
});

export type EstadoPedido = { erro?: string; campos?: Partial<Record<string, string>> };

/** A5 · "É meu": cria o pedido e leva para a confirmação (A6). */
export async function enviarPedido(_anterior: EstadoPedido, formData: FormData): Promise<EstadoPedido> {
  const perfil = await exigirPapelNaAcao("aluno");

  const entrada = esquemaPedido.safeParse(Object.fromEntries(formData));
  if (!entrada.success) {
    return {
      erro: "Confira os campos destacados.",
      campos: Object.fromEntries(entrada.error.issues.map((i) => [String(i.path[0]), i.message])),
    };
  }

  let pedidoId: string;
  try {
    ({ id: pedidoId } = await dados().criarPedido(perfil.id, entrada.data));
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) return { erro: erro.message };
    throw erro;
  }
  redirect(`/aluno/pedidos/${pedidoId}?novo=1`);
}
