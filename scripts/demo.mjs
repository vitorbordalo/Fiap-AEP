// Apresentação: compila e sobe o app em modo demonstração, versão de produção.
// Mais rápido que `npm run dev` (nenhuma tela compila na primeira visita) e sem nada de
// desenvolvimento na tela. Dados fictícios em memória: reiniciar o comando volta tudo ao início.
//   npm run demo              -> http://localhost:3000
//   npm run demo -- 3100      -> outra porta

import { spawn } from "node:child_process";

const porta = process.argv[2] ?? process.env.PORT ?? "3000";
const env = {
  ...process.env,
  // força a demonstração mesmo se houver .env.local com Supabase
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_PUBLIC_MODO_DEMO: "1",
};

function rodar(comando) {
  return new Promise((resolve, reject) => {
    const processo = spawn(comando, { env, shell: true, stdio: "inherit" });
    processo.on("exit", (codigo) => (codigo === 0 ? resolve() : reject(new Error(`"${comando}" saiu com código ${codigo}`))));
  });
}

try {
  console.log("\n▶ Compilando a demonstração (leva cerca de 1 minuto)…\n");
  await rodar("npx next build");
  console.log(`\n✓ Pronto. Abra http://localhost:${porta}/login e escolha um perfil.`);
  console.log("  Para trocar de perfil durante a apresentação: botão “Demonstração” no canto inferior esquerdo.");
  console.log("  Para recomeçar com os dados originais: Ctrl+C e npm run demo de novo.\n");
  await rodar(`npx next start -p ${porta}`);
} catch (erro) {
  console.error(`\n✗ ${erro instanceof Error ? erro.message : erro}`);
  if (String(erro).includes("start")) console.error(`  A porta ${porta} pode estar em uso (um npm run dev aberto?). Tente: npm run demo -- 3100`);
  process.exit(1);
}
