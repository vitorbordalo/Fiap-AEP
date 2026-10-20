/**
 * Modo demonstração: login com qualquer usuário e senha, dados do gerador do seed em memória.
 * - Em desenvolvimento, liga sozinho enquanto o Supabase não está configurado (sem .env.local).
 * - Em produção, só liga com NEXT_PUBLIC_MODO_DEMO=1 (ex.: uma demo pública para o portfólio).
 *   Assim um deploy que esqueceu as chaves não vira, sem ninguém perceber, um app que perde os dados.
 */
const supabaseConfigurado = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const demonstracaoPermitida = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_MODO_DEMO === "1";

export const MODO_DEMO = !supabaseConfigurado && demonstracaoPermitida;

/** Produção sem Supabase e sem pedir a demonstração: o app avisa em vez de funcionar pela metade. */
export const CONFIGURACAO_AUSENTE = !supabaseConfigurado && !demonstracaoPermitida;
