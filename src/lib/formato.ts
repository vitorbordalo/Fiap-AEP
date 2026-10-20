/**
 * Formatação de datas e textos da interface. Tudo no fuso de São Paulo, para o servidor
 * (que pode estar em UTC, como na Vercel) e o navegador mostrarem o mesmo horário.
 */

export const FUSO = "America/Sao_Paulo";

const MS_MIN = 60 * 1000;
const MS_DIA = 24 * 60 * MS_MIN;

const partes = (data: Date) => {
  const formato = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const valores = Object.fromEntries(formato.formatToParts(data).map((p) => [p.type, p.value]));
  return {
    dia: valores.day ?? "",
    mes: valores.month ?? "",
    ano: valores.year ?? "",
    hora: valores.hour ?? "",
    minuto: valores.minute ?? "",
  };
};

/** 19/10/2026 */
export function formatarData(data: Date) {
  const p = partes(data);
  return `${p.dia}/${p.mes}/${p.ano}`;
}

/** 22:10 */
export function formatarHora(data: Date) {
  const p = partes(data);
  return `${p.hora}:${p.minuto}`;
}

/** 19/10, 22:10 */
export function formatarDataHoraCurta(data: Date) {
  const p = partes(data);
  return `${p.dia}/${p.mes}, ${p.hora}:${p.minuto}`;
}

/** 19/10/2026 · 22:10 */
export function formatarDataHora(data: Date) {
  return `${formatarData(data)} · ${formatarHora(data)}`;
}

/** 19/10 */
export function formatarDiaMes(data: Date) {
  const p = partes(data);
  return `${p.dia}/${p.mes}`;
}

/** "outubro de 2026" */
export function formatarMesAno(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, month: "long", year: "numeric" }).format(data);
}

/** Data local (São Paulo) no formato de <input type="date">: 2026-10-19 */
export function dataIso(data: Date) {
  const p = partes(data);
  return `${p.ano}-${p.mes}-${p.dia}`;
}

/** Valor para <input type="datetime-local">: 2026-10-19T22:10 */
export function dataHoraIso(data: Date) {
  const p = partes(data);
  return `${p.ano}-${p.mes}-${p.dia}T${p.hora}:${p.minuto}`;
}

/** Converte o valor de um <input type="datetime-local"> (horário de São Paulo) para Date. */
export function lerDataHoraLocal(valor: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return null;
  const [, ano, mes, dia, hora, minuto] = m.map(Number) as [number, number, number, number, number, number];
  // São Paulo não tem horário de verão desde 2019: UTC-3
  return new Date(Date.UTC(ano, mes - 1, dia, hora + 3, minuto));
}

/** Hora do dia em São Paulo (0 a 23). */
export function horaLocal(data: Date) {
  return Number(partes(data).hora);
}

/** Dia da semana em São Paulo (0 = domingo). */
export function diaDaSemanaLocal(data: Date) {
  return new Date(`${dataIso(data)}T12:00:00Z`).getUTCDay();
}

/** Dias inteiros desde a data (0 = hoje, pelo calendário de São Paulo). */
export function diasDesde(data: Date, agora = new Date()) {
  const inicio = Date.parse(`${dataIso(data)}T00:00:00Z`);
  const hoje = Date.parse(`${dataIso(agora)}T00:00:00Z`);
  return Math.round((hoje - inicio) / MS_DIA);
}

/** "Hoje", "Ontem", "3 dias" */
export function formatarTempoNoLocal(data: Date, agora = new Date()) {
  const dias = diasDesde(data, agora);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return `${dias} dias`;
}

/** "agora", "há 25 min", "há 2 h", "ontem", "há 3 dias" */
export function formatarRelativo(data: Date, agora = new Date()) {
  const minutos = Math.floor((agora.getTime() - data.getTime()) / MS_MIN);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24 && diasDesde(data, agora) === 0) return `há ${horas} h`;
  const dias = diasDesde(data, agora);
  if (dias <= 1) return "ontem";
  return `há ${dias} dias`;
}

/** "AP-0001" -> "#AP-0001" */
export function formatarCodigo(codigo: string) {
  return `#${codigo}`;
}

/** "Ana Souza" -> "AS" */
export function iniciais(nome: string) {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "?";
  const primeira = palavras[0]?.[0] ?? "";
  const ultima = palavras.length > 1 ? (palavras[palavras.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/** 1 item / 2 itens */
export function plural(quantidade: number, singular: string, pluralTexto = `${singular}s`) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}

/** Remove acentos e caixa para comparar textos de busca. */
export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** "40 min", "11 horas", "3 dias" */
export function formatarDuracao(ms: number) {
  const minutos = Math.max(0, Math.round(ms / MS_MIN));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return horas === 1 ? "1 hora" : `${horas} horas`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "1 dia" : `${dias} dias`;
}
