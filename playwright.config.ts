import { defineConfig, devices } from "@playwright/test";

const PORTA = Number(process.env.E2E_PORTA ?? 3200);

/**
 * Fluxos ponta a ponta. Por padrão sobe o app em modo demonstração (sem .env.local).
 * Navegador: Chromium do Playwright (npx playwright install chromium) ou um canal instalado,
 * por exemplo PW_CHANNEL=msedge no Windows.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORTA}`,
    channel: process.env.PW_CHANNEL || undefined,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL || undefined } }],
  // no modo Supabase quem sobe o app é scripts/e2e-supabase.mjs
  webServer: process.env.E2E_MODO === "supabase" ? undefined : {
    command: `npm run build && npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}/login`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // força o modo demonstração mesmo se houver .env.local (em produção ele precisa ser pedido)
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_MODO_DEMO: "1",
    },
  },
});
