// E2E com o app em modo Supabase, sem Docker e sem conta no Supabase:
// Postgres 17 + PostgREST reais + gateway que imita Auth/Storage (scripts/db/gateway-supabase.mjs).
// Roda o seed de verdade, compila o app com as chaves locais e executa os testes do Playwright.
// Uso: npm run test:e2e:supabase   (precisa dos binários; veja docs/testes.md)

import { spawn } from "node:child_process";
import { iniciarGateway } from "./db/gateway-supabase.mjs";
import { binariosDisponiveis, iniciarSupabaseLocal, portaLivre } from "./db/supabase-local.mjs";

if (!binariosDisponiveis()) {
  console.error("✗ Postgres/PostgREST não encontrados. Veja docs/testes.md.");
  process.exit(1);
}

function rodar(comando, env) {
  return new Promise((resolve, reject) => {
    const processo = spawn(comando, { env, shell: true, stdio: "inherit" });
    processo.on("exit", (codigo) => (codigo === 0 ? resolve() : reject(new Error(`"${comando}" saiu com código ${codigo}`))));
  });
}

function encerrarArvore(processo) {
  if (!processo?.pid) return;
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(processo.pid), "/T", "/F"], { stdio: "ignore" });
  else processo.kill("SIGTERM");
}

const local = await iniciarSupabaseLocal();
const gateway = await iniciarGateway(local, await portaLivre());
const portaApp = await portaLivre();
let app;

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: gateway.url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.chaveAnon,
  SUPABASE_SERVICE_ROLE_KEY: local.chaveServico,
  NEXT_PUBLIC_SITE_URL: `http://localhost:${portaApp}`,
  ALLOWED_EMAIL_DOMAINS: "fiap.com.br",
  NEXT_DIST_DIR: ".next-e2e-supabase",
};

let codigo = 0;
try {
  console.log(`\n▶ Supabase local em ${gateway.url}; populando com o seed…`);
  await rodar("node scripts/seed/index.mjs", env);

  console.log("\n▶ Compilando o app em modo Supabase…");
  await rodar("npx next build", env);

  app = spawn(`npx next start -p ${portaApp}`, { env, shell: true, stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    const pronto = await fetch(`http://localhost:${portaApp}/login`).then((r) => r.ok).catch(() => false);
    if (pronto) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n▶ Playwright contra http://localhost:${portaApp}`);
  await rodar("npx playwright test", {
    ...env,
    E2E_MODO: "supabase",
    E2E_PORTA: String(portaApp),
    E2E_SUPABASE_URL: gateway.url,
    E2E_JWT_SECRET: local.segredo,
  });
} catch (erro) {
  console.error(`\n✗ ${erro instanceof Error ? erro.message : erro}`);
  codigo = 1;
} finally {
  encerrarArvore(app);
  await gateway.parar();
  await local.parar();
}
process.exit(codigo);
