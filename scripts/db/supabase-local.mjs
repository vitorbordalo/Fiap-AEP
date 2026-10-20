// "Supabase local" sem Docker, para testes de integração: Postgres de verdade + PostgREST.
// Aplica o stub do Supabase e as migrations, e assina JWTs como o Supabase Auth faria.
// Os binários ficam fora do repositório (veja docs/testes.md):
//   PG_BIN         pasta com initdb.exe, pg_ctl.exe e as DLLs (padrão: %LOCALAPPDATA%/pgsql-download/pgsql/bin)
//   POSTGREST_BIN  caminho do postgrest(.exe)                    (padrão: %LOCALAPPDATA%/postgrest/postgrest.exe)

import { spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { listarMigrations } from "./pglite.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const exe = process.platform === "win32" ? ".exe" : "";
const localAppData = process.env.LOCALAPPDATA ?? "";

export const PG_BIN = process.env.PG_BIN ?? path.join(localAppData, "pgsql-download", "pgsql", "bin");
export const POSTGREST_BIN = process.env.POSTGREST_BIN ?? path.join(localAppData, "postgrest", `postgrest${exe}`);

export function binariosDisponiveis() {
  return existsSync(path.join(PG_BIN, `initdb${exe}`)) && existsSync(POSTGREST_BIN);
}

const base64url = (dados) => Buffer.from(dados).toString("base64url");

/** JWT HS256 igual ao do Supabase Auth (role "authenticated" e o id do usuário em "sub"). */
function assinarJwt(segredo, claims) {
  const cabecalho = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = base64url(JSON.stringify({ aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, ...claims }));
  const assinatura = createHmac("sha256", segredo).update(`${cabecalho}.${corpo}`).digest("base64url");
  return `${cabecalho}.${corpo}.${assinatura}`;
}

/**
 * Roda um binário e espera ele sair. No Windows, o pg_ctl deixa o Postgres herdar os pipes de saída;
 * com stdio "ignore" esperamos só o processo, e não o fechamento dos pipes (que nunca acontece).
 */
function rodar(binario, args, env) {
  return new Promise((resolve, reject) => {
    const processo = spawn(binario, args, { env, stdio: "ignore", windowsHide: true });
    processo.on("error", reject);
    processo.on("exit", (codigo) => (codigo === 0 ? resolve() : reject(new Error(`${path.basename(binario)} saiu com código ${codigo}`))));
  });
}

/** Pede uma porta livre ao sistema (evita colisão com execuções anteriores). */
function portaLivre() {
  return new Promise((resolve, reject) => {
    const servidor = createServer();
    servidor.on("error", reject);
    servidor.listen(0, "127.0.0.1", () => {
      const { port } = servidor.address();
      servidor.close(() => resolve(port));
    });
  });
}

async function esperar(condicao, descricao, tentativas = 100) {
  for (let i = 0; i < tentativas; i++) {
    if (await condicao().catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Tempo esgotado esperando ${descricao}`);
}

/**
 * Sobe Postgres + PostgREST em portas livres, com banco novo.
 * @param {{ portaPg?: number, portaApi?: number }} [opcoes]
 */
export async function iniciarSupabaseLocal(opcoes = {}) {
  const portaPg = opcoes.portaPg ?? (await portaLivre());
  const portaApi = opcoes.portaApi ?? (await portaLivre());
  const pasta = await mkdtemp(path.join(tmpdir(), "ap-supabase-"));
  const dados = path.join(pasta, "dados");
  const ambiente = { ...process.env, PATH: `${PG_BIN}${path.delimiter}${process.env.PATH}` };

  await rodar(path.join(PG_BIN, `initdb${exe}`), ["-D", dados, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--locale=C"], ambiente);
  const log = path.join(pasta, "postgres.log");
  await rodar(
    path.join(PG_BIN, `pg_ctl${exe}`),
    ["start", "-D", dados, "-w", "-l", log, "-o", `-p ${portaPg} -c listen_addresses=127.0.0.1 -c fsync=off`],
    ambiente,
  ).catch(async (erro) => {
    const final = await readFile(log, "utf8").catch(() => "(sem log)");
    throw new Error(`${erro.message}
${final.slice(-800)}`);
  });

  const sql = new pg.Client({ host: "127.0.0.1", port: portaPg, user: "postgres", database: "postgres" });
  await sql.connect();
  await sql.query(await readFile(path.join(raiz, "scripts", "db", "supabase-stub.sql"), "utf8"));
  for (const arquivo of await listarMigrations()) {
    try {
      await sql.query(await readFile(path.join(raiz, "supabase", "migrations", arquivo), "utf8"));
    } catch (erro) {
      throw new Error(`Falha ao aplicar ${arquivo}: ${erro instanceof Error ? erro.message : erro}`);
    }
  }

  const segredo = randomBytes(32).toString("hex");
  const config = path.join(pasta, "postgrest.conf");
  await writeFile(
    config,
    [
      `db-uri = "postgres://postgres@127.0.0.1:${portaPg}/postgres"`,
      `db-schemas = "public"`,
      `db-anon-role = "anon"`,
      `db-pool = 4`,
      `jwt-secret = "${segredo}"`,
      `jwt-aud = "authenticated"`,
      `server-host = "127.0.0.1"`,
      `server-port = ${portaApi}`,
      `log-level = "error"`,
    ].join("\n"),
  );
  const postgrest = spawn(POSTGREST_BIN, [config], { env: ambiente, stdio: ["ignore", "pipe", "pipe"] });
  let saida = "";
  postgrest.stdout.on("data", (d) => (saida += d));
  postgrest.stderr.on("data", (d) => (saida += d));

  const url = `http://127.0.0.1:${portaApi}`;
  await esperar(async () => (await fetch(url)).ok, `o PostgREST (${saida.slice(-300)})`);

  return {
    url,
    sql,
    /** JWT de um usuário logado, para usar como chave do supabase-js. */
    jwtPara: (userId) => assinarJwt(segredo, { sub: userId, role: "authenticated" }),
    /** Pede ao PostgREST para reler o schema (depois de criar tabelas ou views nos testes). */
    recarregarSchema: () => sql.query("notify pgrst, 'reload schema'"),
    async parar() {
      postgrest.kill();
      await sql.end().catch(() => undefined);
      await rodar(path.join(PG_BIN, `pg_ctl${exe}`), ["stop", "-D", dados, "-m", "immediate"], ambiente).catch(() => undefined);
      await rm(pasta, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}
