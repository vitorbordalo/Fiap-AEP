// Banco Postgres em memória (PGlite) com as migrations do projeto aplicadas.
// Usado pelo `npm run db:validar` e pelos testes de RLS. Não precisa de Docker.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pastaMigrations = path.join(raiz, "supabase", "migrations");

/** Lista os arquivos .sql de supabase/migrations na ordem em que o Supabase aplica. */
export async function listarMigrations() {
  const arquivos = await readdir(pastaMigrations);
  return arquivos.filter((nome) => nome.endsWith(".sql")).sort();
}

/**
 * Cria um banco novo, aplica o stub do Supabase e todas as migrations.
 * @param {{ aoAplicar?: (arquivo: string) => void }} [opcoes]
 */
export async function criarBanco({ aoAplicar } = {}) {
  const db = new PGlite();
  await db.exec(await readFile(path.join(raiz, "scripts", "db", "supabase-stub.sql"), "utf8"));

  for (const arquivo of await listarMigrations()) {
    const sql = await readFile(path.join(pastaMigrations, arquivo), "utf8");
    try {
      await db.exec(sql);
    } catch (erro) {
      throw new Error(`Falha ao aplicar ${arquivo}: ${erro instanceof Error ? erro.message : erro}`, {
        cause: erro,
      });
    }
    aoAplicar?.(arquivo);
  }
  return db;
}

/**
 * Executa `fn` como um usuário logado (papel `authenticated` + JWT com o id dele), como o PostgREST faz.
 * Tudo roda numa transação desfeita no final, então os testes não interferem uns nos outros.
 * @template T
 * @param {PGlite} db
 * @param {string} userId
 * @param {(tx: import("@electric-sql/pglite").Transaction) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function comoUsuario(db, userId, fn) {
  let resultado;
  await db.transaction(async (tx) => {
    await entrarComo(tx, userId);
    try {
      resultado = await fn(tx);
    } finally {
      await tx.rollback();
    }
  });
  return resultado;
}

/**
 * Troca o usuário logado dentro de uma transação já aberta (para fluxos com mais de um perfil).
 * @param {import("@electric-sql/pglite").Transaction} tx
 * @param {string} userId
 */
export async function entrarComo(tx, userId) {
  await tx.exec("reset role");
  await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId })]);
  await tx.exec("set local role authenticated");
}
