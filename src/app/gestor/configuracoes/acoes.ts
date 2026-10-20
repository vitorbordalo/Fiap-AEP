"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emailPermitido, esquemaEmail } from "@/lib/auth/email";
import { ehPapel } from "@/lib/auth/sessao-demo";
import { exigirPapelNaAcao } from "@/lib/auth/sessao";
import { dados, ErroDeNegocio } from "@/lib/dados";
import { ehUuid } from "@/lib/utils";
import { dominiosPermitidos } from "@/lib/env";
import type { Papel } from "@/lib/supabase/database.types";

export type ResultadoConfig = { ok: true; mensagem: string } | { ok: false; erro: string };

/** Erro de regra (ex.: "Pessoa não encontrada") vira mensagem na tela em vez de derrubar a página. */
async function tentar(acao: () => Promise<ResultadoConfig>): Promise<ResultadoConfig> {
  try {
    return await acao();
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) return { ok: false, erro: erro.message };
    throw erro;
  }
}

const esquemaDias = z.coerce
  .number({ error: "Informe um número de dias." })
  .int({ error: "Use um número inteiro." })
  .min(1, { error: "Use pelo menos 1 dia." })
  .max(365, { error: "Use no máximo 365 dias." });

/** G3 · Dias para um item passar de Recebido para Aguardando retirada. */
export async function salvarDias(dias: string): Promise<ResultadoConfig> {
  await exigirPapelNaAcao("gestor");
  const valido = esquemaDias.safeParse(dias);
  if (!valido.success) return { ok: false, erro: valido.error.issues[0]?.message ?? "Valor inválido." };
  return tentar(async () => {
    await dados().atualizarDiasParaAguardando(valido.data);
    revalidatePath("/", "layout");
    return { ok: true, mensagem: `Pronto. Itens com mais de ${valido.data} dias aparecem em Aguardando retirada.` };
  });
}

type PapelValidado = { ok: true; papel: Papel; local: string | null } | { ok: false; erro: string };

function validarPapelELocal(papel: unknown, localId: unknown): PapelValidado {
  if (!ehPapel(papel)) return { ok: false, erro: "Escolha um perfil." };
  const local = ehUuid(localId) ? localId : null;
  if (papel === "equipe" && !local) return { ok: false, erro: "Escolha o local de quem é da equipe." };
  return { ok: true, papel, local };
}

/** G3 · Muda o perfil (e o local, para a equipe) de alguém. */
export async function alterarPessoa(id: string, papel: unknown, localId: unknown): Promise<ResultadoConfig> {
  const gestor = await exigirPapelNaAcao("gestor");
  if (!ehUuid(id)) return { ok: false, erro: "Pessoa não encontrada." };
  if (id === gestor.id && papel !== "gestor") {
    return { ok: false, erro: "Você não pode tirar o seu próprio acesso de coordenação. Peça a outra pessoa da coordenação." };
  }
  const valido = validarPapelELocal(papel, localId);
  if (!valido.ok) return valido;
  return tentar(async () => {
    await dados().alterarPessoa(id, valido.papel, valido.local);
    revalidatePath("/gestor/configuracoes");
    return { ok: true, mensagem: "Perfil atualizado." };
  });
}

/** G3 · Dá um perfil a alguém pelo e-mail institucional. */
export async function adicionarPessoa(email: string, papel: unknown, localId: unknown): Promise<ResultadoConfig> {
  await exigirPapelNaAcao("gestor");
  const emailValido = esquemaEmail.safeParse(email);
  if (!emailValido.success) return { ok: false, erro: "Digite um e-mail válido." };
  const dominios = dominiosPermitidos();
  if (!emailPermitido(emailValido.data, dominios)) return { ok: false, erro: `Use um e-mail institucional (@${dominios[0]}).` };
  const valido = validarPapelELocal(papel, localId);
  if (!valido.ok) return valido;
  return tentar(async () => {
    await dados().definirPapelPorEmail(emailValido.data, valido.papel, valido.local);
    revalidatePath("/gestor/configuracoes");
    return { ok: true, mensagem: `${emailValido.data} agora é ${valido.papel}.` };
  });
}
