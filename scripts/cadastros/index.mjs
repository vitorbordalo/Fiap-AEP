// Carrega os cadastros reais (locais, salas, turmas, categorias) no Supabase de produção.
//   npm run db:cadastros                      -> usa scripts/cadastros/cadastros.json
//   npm run db:cadastros -- caminho/outro.json
// Só acrescenta ou atualiza pelo nome (upsert); nunca apaga nem cria dados fictícios.
// Ícones aceitos: os de src/components/ui/category-icon.tsx (smartphone, headphones, laptop,
// plug-zap, glass-water, shirt, backpack, id-card, umbrella, ellipsis, package).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ICONES = ["smartphone", "headphones", "laptop", "plug-zap", "glass-water", "shirt", "backpack", "id-card", "umbrella", "ellipsis", "package"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("✗ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}

const arquivo = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "cadastros.json");
const dados = JSON.parse(await readFile(arquivo, "utf8"));

const erros = [];
const textoValido = (v) => typeof v === "string" && v.trim().length > 0;
for (const s of dados.salas ?? []) if (!textoValido(s)) erros.push(`sala inválida: ${JSON.stringify(s)}`);
for (const t of dados.turmas ?? []) if (!textoValido(t)) erros.push(`turma inválida: ${JSON.stringify(t)}`);
for (const l of dados.locais ?? []) if (!textoValido(l?.nome)) erros.push(`local sem nome: ${JSON.stringify(l)}`);
for (const c of dados.categorias ?? []) {
  if (!textoValido(c?.nome)) erros.push(`categoria sem nome: ${JSON.stringify(c)}`);
  if (c?.icone && !ICONES.includes(c.icone)) erros.push(`ícone desconhecido em ${c.nome}: ${c.icone}`);
  if (c?.cor && !/^#[0-9A-Fa-f]{6}$/.test(c.cor)) erros.push(`cor inválida em ${c.nome}: ${c.cor}`);
}
if (erros.length) {
  console.error(`✗ ${arquivo} tem problemas:\n  ${erros.join("\n  ")}`);
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });

async function salvar(tabela, linhas) {
  if (!linhas.length) return;
  const { error } = await supabase.from(tabela).upsert(linhas, { onConflict: "nome" });
  if (error) throw new Error(`${tabela}: ${error.message}`);
  console.log(`✓ ${tabela}: ${linhas.length}`);
}

try {
  await salvar("locais", (dados.locais ?? []).map((l) => ({ nome: l.nome.trim(), horario_retirada: l.horario_retirada ?? "" })));
  await salvar("salas", (dados.salas ?? []).map((nome) => ({ nome: nome.trim() })));
  await salvar("turmas", (dados.turmas ?? []).map((nome) => ({ nome: nome.trim() })));
  await salvar(
    "categorias",
    (dados.categorias ?? []).map((c, ordem) => ({
      nome: c.nome.trim(),
      icone: c.icone ?? "package",
      cor: c.cor ?? "#737373",
      foto_sensivel: Boolean(c.foto_sensivel),
      ordem,
    })),
  );
  console.log("\nPronto. Nada foi apagado; itens já cadastrados continuam ligados às mesmas salas e categorias.");
} catch (erro) {
  console.error(`✗ ${erro instanceof Error ? erro.message : erro}`);
  process.exit(1);
}
