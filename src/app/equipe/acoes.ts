"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapelNaAcao } from "@/lib/auth/sessao";
import { dados, ErroDeNegocio } from "@/lib/dados";
import { ehUuid } from "@/lib/utils";

const esquemaRetirada = z.object({
  itemId: z.string().refine(ehUuid, { error: "Item inválido." }),
  pedidoId: z.string().refine(ehUuid, { error: "Pedido inválido." }).nullable(),
  rm: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, { error: "RM tem só números (4 a 10 dígitos)." }),
  nome: z.string().trim().min(3, { error: "Digite o nome completo." }).max(120),
  carteirinhaConferida: z.literal(true, { error: "Confira a carteirinha do aluno." }),
});

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

/** E5 · Registra a retirada (com ou sem pedido). Funcionário e data/hora vêm da sessão. */
export async function registrarRetirada(
  entrada: z.input<typeof esquemaRetirada>,
): Promise<Resultado<{ retiradaId: string }>> {
  const perfil = await exigirPapelNaAcao("equipe", "gestor");
  const valido = esquemaRetirada.safeParse(entrada);
  if (!valido.success) return { ok: false, erro: valido.error.issues[0]?.message ?? "Confira os dados." };

  try {
    const { id } = await dados().registrarRetirada(perfil.id, {
      itemId: valido.data.itemId,
      pedidoId: valido.data.pedidoId,
      rm: valido.data.rm,
      nome: valido.data.nome,
    });
    revalidatePath("/", "layout");
    return { ok: true, retiradaId: id };
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) return { ok: false, erro: erro.message };
    throw erro;
  }
}

/** E7 (e o "Desfazer" do toast) · Marca a retirada como desfeita. Nunca apaga. */
export async function desfazerRetirada(retiradaId: string): Promise<Resultado> {
  const perfil = await exigirPapelNaAcao("equipe", "gestor");
  if (!ehUuid(retiradaId)) return { ok: false, erro: "Retirada não encontrada." };
  try {
    await dados().desfazerRetirada(perfil.id, retiradaId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) return { ok: false, erro: erro.message };
    throw erro;
  }
}
