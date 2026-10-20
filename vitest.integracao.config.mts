import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Testes de integração (Postgres + PostgREST reais). Mais lentos: ficam fora do `npm test`. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@scripts": fileURLToPath(new URL("./scripts", import.meta.url)),
    },
  },
  test: {
    include: ["supabase/tests/integracao/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
