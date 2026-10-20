/**
 * Regra de status do item (CLAUDE.md, "Regras de negócio").
 * O banco calcula o mesmo status na view `itens_com_status`; esta função é a versão
 * em TypeScript, usada em textos derivados (ex.: "vai para Aguardando amanhã") e nos testes.
 */

export const ITEM_STATUS = ["recebido", "aguardando", "retirado"] as const;
export type ItemStatus = (typeof ITEM_STATUS)[number];

export const DIAS_PARA_AGUARDANDO_PADRAO = 7;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

type EntradaStatus = {
  /** Quando o item foi encontrado (início da contagem de tempo no local). */
  encontradoEm: Date;
  /** Existe uma retirada válida (não desfeita) para o item. */
  temRetiradaValida: boolean;
  diasParaAguardando: number;
  agora?: Date;
};

export function calcularStatus({
  encontradoEm,
  temRetiradaValida,
  diasParaAguardando,
  agora = new Date(),
}: EntradaStatus): ItemStatus {
  if (temRetiradaValida) return "retirado";
  const limite = encontradoEm.getTime() + diasParaAguardando * MS_POR_DIA;
  return agora.getTime() > limite ? "aguardando" : "recebido";
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  recebido: "Recebido",
  aguardando: "Aguardando retirada",
  retirado: "Retirado",
};

/**
 * Aviso da lista de Recebidos: o item vira Aguardando hoje ou amanhã (pelo calendário de São Paulo)?
 * null quando ainda falta mais tempo (ou se já foi retirado).
 */
export function quandoViraAguardando(
  encontradoEm: Date,
  diasParaAguardando: number,
  agora = new Date(),
): "hoje" | "amanha" | null {
  const vira = new Date(encontradoEm.getTime() + diasParaAguardando * MS_POR_DIA);
  if (vira.getTime() <= agora.getTime()) return null;
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  if (dia(vira) === dia(agora)) return "hoje";
  if (dia(vira) === dia(new Date(agora.getTime() + MS_POR_DIA))) return "amanha";
  return null;
}
