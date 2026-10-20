// Aplica todas as migrations num Postgres em memória e falha se alguma der erro.
// Uso: npm run db:validar

import { criarBanco } from "./pglite.mjs";

try {
  const db = await criarBanco({ aoAplicar: (arquivo) => console.log(`✓ ${arquivo}`) });
  const { rows } = await db.query(
    "select count(*)::int as tabelas from pg_tables where schemaname = 'public' and rowsecurity",
  );
  console.log(`\nMigrations válidas. ${rows[0].tabelas} tabelas com RLS habilitado.`);
  await db.close();
} catch (erro) {
  console.error(`✗ ${erro instanceof Error ? erro.message : erro}`);
  process.exit(1);
}
