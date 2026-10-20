// Integração: o repositório Supabase (src/lib/dados/supabase.ts) falando com Postgres 17 + PostgREST
// de verdade, pelo supabase-js, com o JWT de cada perfil. Testa as queries, o RLS e o mapeamento de erros.
// Rode com: npm run test:integracao (pula sozinho se os binários não estiverem instalados; veja docs/testes.md).

import { createClient } from "@supabase/supabase-js";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { binariosDisponiveis, iniciarSupabaseLocal } from "../../../scripts/db/supabase-local.mjs";
import { gerarDadosDemo, type DadosDemo } from "../../../scripts/seed/dados.mjs";
import usuariosTeste from "../../../scripts/seed/usuarios-teste.json";
import { criarRepositorioSupabase } from "@/lib/dados/supabase";
import { ErroDeNegocio } from "@/lib/dados/tipos";
import type { Database } from "@/lib/supabase/database.types";

const idDe = (papel: string) => usuariosTeste.find((u) => u.role === papel)?.id as string;
const ALUNO = idDe("aluno");
const MONITOR = idDe("monitor");
const EQUIPE = idDe("equipe");
const GESTOR = idDe("gestor");

type Local = Awaited<ReturnType<typeof iniciarSupabaseLocal>>;
let local: Local;
let dados: DadosDemo;

async function inserir(sql: pg.Client, tabela: string, linhas: Record<string, unknown>[]) {
  for (const linha of linhas) {
    const colunas = Object.keys(linha);
    await sql.query(
      `insert into ${tabela} (${colunas.join(", ")}) values (${colunas.map((_, i) => `$${i + 1}`).join(", ")})`,
      colunas.map((c) => linha[c]),
    );
  }
}

/** Repositório com a sessão de um usuário (o JWT faz o papel do cookie de sessão). */
function repoComo(userId: string) {
  const cliente = createClient<Database>(local.url, local.jwtPara(userId), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // o PostgREST local responde na raiz; no Supabase ele fica em /rest/v1
    global: { fetch: (entrada, init) => fetch(String(entrada).replace("/rest/v1", ""), init) },
  });
  return criarRepositorioSupabase({ cliente: async () => cliente });
}

const contar = async (sqlTexto: string, params: unknown[] = []) =>
  Number((await local.sql.query<{ n: string }>(sqlTexto, params)).rows[0]?.n ?? 0);

describe.skipIf(!binariosDisponiveis())("repositório Supabase (Postgres + PostgREST reais)", () => {
  beforeAll(async () => {
    local = await iniciarSupabaseLocal();
    dados = gerarDadosDemo({ agora: new Date() });
    const { sql } = local;
    await inserir(sql, "locais", dados.locais);
    await inserir(sql, "salas", dados.salas);
    await inserir(sql, "turmas", dados.turmas);
    await inserir(sql, "categorias", dados.categorias);
    for (const u of dados.usuarios) {
      await sql.query("insert into auth.users (id, email) values ($1, $2)", [u.id, u.email]);
      await sql.query("update profiles set nome = $2, rm = $3, role = $4, local_id = $5 where id = $1", [u.id, u.nome, u.rm, u.role, u.local_id]);
    }
    await inserir(sql, "itens", dados.itens);
    await inserir(sql, "pedidos", dados.pedidos);
    await inserir(sql, "retiradas", dados.retiradas);
  }, 120_000);

  afterAll(async () => {
    await local?.parar();
  });

  it("catálogo vem completo e ordenado", async () => {
    const catalogo = await repoComo(ALUNO).catalogo();
    expect(catalogo.categorias.map((c) => c.nome)[0]).toBe("Celular");
    expect(catalogo.categorias).toHaveLength(10);
    expect(catalogo.salas).toHaveLength(dados.salas.length);
    expect(catalogo.diasParaAguardando).toBe(7);
  });

  describe("aluno", () => {
    it("busca mostra só itens não retirados, com Documento sem foto e sem observação", async () => {
      const itens = await repoComo(ALUNO).buscarItensPublicos({});
      expect(itens).toHaveLength(dados.resumo.recebidos + dados.resumo.aguardando);
      const documentos = itens.filter((i) => i.categoria.nome === "Documento");
      expect(documentos.length).toBeGreaterThan(0);
      for (const doc of documentos) expect(doc).toMatchObject({ fotoUrl: null, observacao: null, fotoOculta: true });
      expect(itens.find((i) => i.categoria.nome !== "Documento")?.fotoUrl).toMatch(/^\/seed\//);
      expect(itens[0]?.codigo).toMatch(/^AP-\d{4}$/);
    });

    it("filtra por data no fuso de São Paulo", async () => {
      const todos = await repoComo(ALUNO).buscarItensPublicos({});
      const alvo = todos[0];
      if (!alvo) throw new Error("sem itens");
      const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(alvo.encontradoEm);
      const doDia = await repoComo(ALUNO).buscarItensPublicos({ data: dia });
      expect(doDia.map((i) => i.id)).toContain(alvo.id);
      expect(doDia.every((i) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(i.encontradoEm) === dia)).toBe(true);
    });

    it("Meus pedidos traz um pedido de cada situação e não mostra pedidos de outros", async () => {
      const repo = repoComo(ALUNO);
      const meus = await repo.listarMeusPedidos(ALUNO);
      expect(meus.map((p) => p.situacao).sort()).toEqual(["encerrado", "pendente", "retirado"]);
      const deOutro = dados.pedidos.find((p) => p.aluno_id !== ALUNO);
      expect(await repo.obterMeuPedido(ALUNO, deOutro?.id as string)).toBeNull();
    });

    it("cria pedido, não duplica e recusa item já retirado", async () => {
      const repo = repoComo(ALUNO);
      const disponivel = (await repo.buscarItensPublicos({})).find(
        (i) => !dados.pedidos.some((p) => p.item_id === i.id && p.aluno_id === ALUNO),
      );
      const novo = { itemId: disponivel?.id as string, salaId: dados.salas[0]?.id as string, turmaId: dados.turmas[0]?.id as string, horario: "21:00" };
      const { id } = await repo.criarPedido(ALUNO, novo);
      expect((await repo.criarPedido(ALUNO, novo)).id).toBe(id);
      expect(await repo.pedidoDoAluno(ALUNO, novo.itemId)).toBe(id);

      const retirado = dados.retiradas.find((r) => !r.desfeita_em)?.item_id as string;
      await expect(repo.criarPedido(ALUNO, { ...novo, itemId: retirado })).rejects.toThrow(ErroDeNegocio);
    });

    it("aluno não registra retirada nem vê a lista da equipe", async () => {
      const repo = repoComo(ALUNO);
      const item = dados.itens[dados.itens.length - 1]?.id as string;
      await expect(repo.registrarRetirada(ALUNO, { itemId: item, pedidoId: null, rm: "550001", nome: "Aluno Teste" })).rejects.toThrow(ErroDeNegocio);
      expect(await repo.listarItensEquipe({ localId: null })).toHaveLength(0);
    });
  });

  describe("monitor", () => {
    it("cadastra item e vê só o que cadastrou", async () => {
      const repo = repoComo(MONITOR);
      const { id, codigo } = await repo.cadastrarItem(MONITOR, {
        fotoPath: "seed/backpack.svg",
        categoriaId: dados.categorias.find((c) => c.nome === "Mochila")?.id as string,
        salaId: dados.salas[0]?.id as string,
        turmaId: null,
        encontradoEm: new Date(Date.now() - 10 * 60 * 1000),
        observacao: "Mochila de teste",
        localId: dados.locais[0]?.id as string,
      });
      expect(codigo).toBe(`AP-${String(dados.itens.length + 1).padStart(4, "0")}`);
      const item = await repo.obterItemCadastrado(MONITOR, id);
      expect(item).toMatchObject({ codigo, status: "recebido", observacao: "Mochila de teste" });
      expect(item?.cadastradoPor.id).toBe(MONITOR);

      const deOutro = dados.itens.find((i) => i.cadastrado_por !== MONITOR)?.id as string;
      expect(await repo.obterItemCadastrado(MONITOR, deOutro)).toBeNull();
      expect((await repoComo(ALUNO).buscarItensPublicos({})).some((i) => i.id === id)).toBe(true);
    });

    it("data no futuro vira mensagem de negócio", async () => {
      await expect(
        repoComo(MONITOR).cadastrarItem(MONITOR, {
          fotoPath: "seed/backpack.svg",
          categoriaId: dados.categorias[0]?.id as string,
          salaId: dados.salas[0]?.id as string,
          turmaId: null,
          encontradoEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
          observacao: null,
          localId: dados.locais[0]?.id as string,
        }),
      ).rejects.toThrow("futuro");
    });
  });

  describe("equipe", () => {
    it("resumo bate com o status calculado pelo banco", async () => {
      const resumo = await repoComo(EQUIPE).resumoEquipe(null);
      const doBanco = async (status: string) => contar("select count(*) as n from itens_com_status where status = $1", [status]);
      expect(resumo.recebidos.total).toBe(await doBanco("recebido"));
      expect(resumo.aguardando.total).toBe(await doBanco("aguardando"));
      expect(resumo.pedidosPendentes.length).toBeGreaterThan(0);
    });

    it("lista por local e status, com pedidos e nomes dos alunos", async () => {
      const ti = dados.locais.find((l) => l.nome === "Sala de TI")?.id as string;
      const lista = await repoComo(EQUIPE).listarItensEquipe({ localId: ti, status: "recebido" });
      expect(lista.length).toBeGreaterThan(0);
      expect(lista.every((i) => i.local.id === ti && i.status === "recebido")).toBe(true);
      const comPedido = (await repoComo(EQUIPE).listarItensEquipe({ localId: null, soComPedido: true }))[0];
      expect(comPedido?.pedidosPendentes[0]?.aluno.nome).toBeTruthy();
    });

    it("registra retirada com pedido, recusa a segunda e desfaz uma vez só", async () => {
      const repo = repoComo(EQUIPE);
      const item = (await repo.listarItensEquipe({ localId: null, soComPedido: true }))[0];
      const pedido = item?.pedidosPendentes[0];
      if (!item || !pedido) throw new Error("sem item com pedido");

      const { id } = await repo.registrarRetirada(EQUIPE, { itemId: item.id, pedidoId: pedido.id, rm: pedido.aluno.rm ?? "550000", nome: pedido.aluno.nome });
      const detalhe = await repo.obterItemDetalhe(item.id);
      expect(detalhe?.status).toBe("retirado");
      expect(detalhe?.retirada?.registradoPor.id).toBe(EQUIPE);
      expect(detalhe?.historico.at(-1)?.tipo).toBe("retirada");

      await expect(repo.registrarRetirada(EQUIPE, { itemId: item.id, pedidoId: null, rm: "550099", nome: "Outra Pessoa" })).rejects.toThrow("já foi retirado");

      expect(await repo.desfazerRetirada(EQUIPE, id)).toEqual({ itemId: item.id });
      await expect(repo.desfazerRetirada(EQUIPE, id)).rejects.toThrow("já foi desfeita");
      const depois = await repo.obterItemDetalhe(item.id);
      expect(depois?.status).not.toBe("retirado");
      expect(depois?.historico.at(-1)).toMatchObject({ tipo: "desfeita" });
    });

    it("pedido de outro item é recusado na retirada", async () => {
      const repo = repoComo(EQUIPE);
      const [a, b] = await repo.listarItensEquipe({ localId: null, status: "recebido" });
      const pedidoDeB = (await repo.listarItensEquipe({ localId: null, soComPedido: true })).find((i) => i.id !== a?.id)?.pedidosPendentes[0];
      if (!a || !b || !pedidoDeB) throw new Error("dados insuficientes");
      await expect(repo.registrarRetirada(EQUIPE, { itemId: a.id, pedidoId: pedidoDeB.id, rm: "550001", nome: "Aluno Teste" })).rejects.toThrow(
        "não é deste item",
      );
    });
  });

  describe("gestor", () => {
    it("dashboard e histórico refletem o banco", async () => {
      const repo = repoComo(GESTOR);
      const painel = await repo.dashboard(null, "30d");
      expect(painel.kpis.cadastrados).toBe(await contar("select count(*) as n from itens where encontrado_em >= now() - interval '30 days'"));
      expect(painel.porSala.length).toBeGreaterThan(0);

      const historico = await repo.historico({ periodo: "30d" });
      expect(historico).toHaveLength(await contar("select count(*) as n from retiradas where retirado_em >= now() - interval '30 days'"));
      expect(historico.some((h) => h.desfeita)).toBe(true);
    });

    it("configurações: lista a equipe, muda dias e papéis; equipe não pode", async () => {
      const repo = repoComo(GESTOR);
      const config = await repo.configuracoes();
      expect(config.pessoas.every((p) => p.papel !== "aluno")).toBe(true);
      expect(config.pessoas.length).toBe(await contar("select count(*) as n from profiles where role <> 'aluno'"));

      await repo.atualizarDiasParaAguardando(5);
      expect((await repo.catalogo()).diasParaAguardando).toBe(5);
      await expect(repoComo(EQUIPE).atualizarDiasParaAguardando(30)).rejects.toThrow(ErroDeNegocio);
      await repo.atualizarDiasParaAguardando(7);

      const aluno2 = dados.usuarios.find((u) => u.role === "aluno" && u.id !== ALUNO)?.id as string;
      await repo.alterarPessoa(aluno2, "monitor", null);
      expect((await repo.configuracoes()).pessoas.some((p) => p.id === aluno2 && p.papel === "monitor")).toBe(true);
      await repo.definirPapelPorEmail(dados.usuarios.find((u) => u.id === aluno2)?.email as string, "aluno", null);
      expect((await repo.configuracoes()).pessoas.some((p) => p.id === aluno2)).toBe(false);
    });
  });
});
