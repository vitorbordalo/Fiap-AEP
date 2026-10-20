import type pg from "pg";

export const PG_BIN: string;
export const POSTGREST_BIN: string;
export function binariosDisponiveis(): boolean;
export function iniciarSupabaseLocal(opcoes?: { portaPg?: number; portaApi?: number }): Promise<{
  url: string;
  sql: pg.Client;
  jwtPara: (userId: string) => string;
  recarregarSchema: () => Promise<unknown>;
  parar: () => Promise<void>;
}>;
