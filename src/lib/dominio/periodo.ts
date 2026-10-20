import { horaLocal } from "@/lib/formato";

/** Períodos do dia usados na busca do aluno e no mapa de calor do dashboard. */
export const PERIODOS = ["manha", "tarde", "noite"] as const;
export type PeriodoDoDia = (typeof PERIODOS)[number];

export const PERIODO_LABEL: Record<PeriodoDoDia, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const PERIODO_FAIXA: Record<PeriodoDoDia, string> = {
  manha: "até 12h",
  tarde: "12h às 18h",
  noite: "depois das 18h",
};

export function periodoDoDia(data: Date): PeriodoDoDia {
  const hora = horaLocal(data);
  if (hora < 12) return "manha";
  if (hora < 18) return "tarde";
  return "noite";
}

export function ehPeriodo(valor: unknown): valor is PeriodoDoDia {
  return typeof valor === "string" && (PERIODOS as readonly string[]).includes(valor);
}
