import "server-only";

/**
 * Limite simples de tentativas por chave (e-mail, IP), em memória.
 * Segura abuso casual do envio de link mágico; em várias instâncias (Vercel) cada uma conta à parte.
 * Para limite global, use o rate limit do Supabase Auth ou um armazenamento compartilhado.
 */
const tentativas = new Map<string, number[]>();

export function dentroDoLimite(chave: string, maximo: number, janelaMs: number): boolean {
  const agora = Date.now();
  const recentes = (tentativas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= maximo) {
    tentativas.set(chave, recentes);
    return false;
  }
  recentes.push(agora);
  tentativas.set(chave, recentes);
  // evita crescer sem limite em servidores de longa duração
  if (tentativas.size > 10_000) tentativas.clear();
  return true;
}
