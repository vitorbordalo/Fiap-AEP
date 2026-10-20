import { formatarHora } from "@/lib/formato";

/**
 * Conferência da retirada (E5): compara o que foi cadastrado com o que o aluno informou.
 * Sala e turma batem se forem as mesmas; o horário bate se a diferença for de até 60 minutos.
 */

export const TOLERANCIA_HORARIO_MIN = 60;

type Cadastro = { salaId: string; turmaId: string | null; encontradoEm: Date };
type Informado = { salaId: string | null; turmaId: string | null; horario: string | null };

export type ResultadoConferencia = {
  sala: boolean;
  /** null quando o item foi cadastrado sem turma: não há o que comparar. */
  turma: boolean | null;
  horario: boolean;
  /** Todos os campos comparáveis batem. */
  confere: boolean;
};

function minutosDoDia(horario: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(horario);
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

/** Diferença em minutos entre dois horários do dia, contando a virada da meia-noite (23:50 e 00:20 = 30). */
export function diferencaDeHorario(a: string, b: string): number | null {
  const ma = minutosDoDia(a);
  const mb = minutosDoDia(b);
  if (ma === null || mb === null) return null;
  const diferenca = Math.abs(ma - mb);
  return Math.min(diferenca, 24 * 60 - diferenca);
}

export function conferir(cadastro: Cadastro, informado: Informado): ResultadoConferencia {
  const sala = informado.salaId !== null && informado.salaId === cadastro.salaId;
  const turma = cadastro.turmaId === null ? null : informado.turmaId === cadastro.turmaId;

  const diferenca = informado.horario ? diferencaDeHorario(formatarHora(cadastro.encontradoEm), informado.horario) : null;
  const horario = diferenca !== null && diferenca <= TOLERANCIA_HORARIO_MIN;

  return { sala, turma, horario, confere: sala && turma !== false && horario };
}
