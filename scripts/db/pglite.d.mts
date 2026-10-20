import type { PGlite, Transaction } from "@electric-sql/pglite";

export function listarMigrations(): Promise<string[]>;
export function criarBanco(opcoes?: { aoAplicar?: (arquivo: string) => void }): Promise<PGlite>;
export function comoUsuario<T>(db: PGlite, userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
export function entrarComo(tx: Transaction, userId: string): Promise<void>;
