// Popula o Supabase com os dados de exemplo (fictícios).
//   npm run db:seed            -> só roda se ainda não houver itens
//   npm run db:seed -- --reset -> APAGA itens, pedidos, retiradas e cadastros de apoio e recria tudo
// Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.
// Só para desenvolvimento e demonstração: nunca rode em um banco com dados reais.

import { createClient } from "@supabase/supabase-js";
import { gerarDadosDemo } from "./dados.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("✗ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}

const resetar = process.argv.includes("--reset");
const supabase = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });

/** Falha com mensagem clara em vez de seguir com dados pela metade. */
function conferir(etapa, { error }) {
  if (error) throw new Error(`${etapa}: ${error.message}`);
}

async function inserir(tabela, linhas) {
  // lotes pequenos para não estourar o limite de payload
  for (let i = 0; i < linhas.length; i += 200) {
    conferir(`inserir ${tabela}`, await supabase.from(tabela).insert(linhas.slice(i, i + 200)));
  }
  console.log(`✓ ${tabela}: ${linhas.length}`);
}

async function apagarDados() {
  // ordem inversa das dependências; a service role pode apagar (o app não pode)
  for (const tabela of ["retiradas", "pedidos", "itens", "categorias", "turmas", "salas", "locais"]) {
    conferir(`apagar ${tabela}`, await supabase.from(tabela).delete().not("id", "is", null));
  }
  conferir("restaurar configurações", await supabase.from("configuracoes").update({ dias_para_aguardando: 7 }).eq("id", true));
  console.log("✓ dados anteriores apagados");
}

async function garantirUsuario(usuario) {
  const { data } = await supabase.auth.admin.getUserById(usuario.id);
  if (!data?.user) {
    const { error } = await supabase.auth.admin.createUser({ id: usuario.id, email: usuario.email, email_confirm: true });
    if (error) throw new Error(`criar usuário ${usuario.email}: ${error.message}`);
  }
  // o perfil nasce como aluno pelo trigger; aqui recebe nome, RM, papel e local
  conferir(
    `perfil ${usuario.email}`,
    await supabase
      .from("profiles")
      .update({ nome: usuario.nome, rm: usuario.rm, role: usuario.role, local_id: usuario.local_id })
      .eq("id", usuario.id),
  );
}

try {
  const { count, error } = await supabase.from("itens").select("id", { count: "exact", head: true });
  conferir("contar itens", { error });

  if (count && !resetar) {
    console.error(`✗ Já existem ${count} itens. Use "npm run db:seed -- --reset" para apagar e recriar os dados de exemplo.`);
    process.exit(1);
  }
  if (resetar) await apagarDados();

  const dados = gerarDadosDemo();

  await inserir("locais", dados.locais);
  await inserir("salas", dados.salas);
  await inserir("turmas", dados.turmas);
  await inserir("categorias", dados.categorias);

  for (const usuario of dados.usuarios) await garantirUsuario(usuario);
  console.log(`✓ usuários: ${dados.usuarios.length}`);

  await inserir("itens", dados.itens);
  await inserir("pedidos", dados.pedidos);
  await inserir("retiradas", dados.retiradas);

  const { recebidos, aguardando, retirados } = dados.resumo;
  console.log(`\nPronto: ${recebidos} recebidos, ${aguardando} aguardando, ${retirados} retirados.`);
  console.log("Entre como cada perfil em http://localhost:3000/dev/entrar");
} catch (erro) {
  console.error(`✗ ${erro instanceof Error ? erro.message : erro}`);
  process.exit(1);
}
