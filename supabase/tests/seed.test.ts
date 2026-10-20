// Valida os dados de exemplo contra as migrations reais: se o seed quebrar alguma constraint,
// trigger ou regra de status, este teste falha antes de rodar no Supabase.

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, criarBanco } from "../../scripts/db/pglite.mjs";
import { gerarDadosDemo, type DadosDemo } from "../../scripts/seed/dados.mjs";
import { calcularStatus } from "../../src/lib/dominio/status";

const agora = new Date();
let db: PGlite;
let dados: DadosDemo;

async function inserir(tabela: string, linhas: Record<string, unknown>[]) {
  for (const linha of linhas) {
    const colunas = Object.keys(linha);
    await db.query(
      `insert into ${tabela} (${colunas.join(", ")}) values (${colunas.map((_, i) => `$${i + 1}`).join(", ")})`,
      colunas.map((c) => linha[c]),
    );
  }
}

beforeAll(async () => {
  db = await criarBanco();
  dados = gerarDadosDemo({ agora });

  await inserir("locais", dados.locais);
  await inserir("salas", dados.salas);
  await inserir("turmas", dados.turmas);
  await inserir("categorias", dados.categorias);
  for (const u of dados.usuarios) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [u.id, u.email]);
    await db.query("update profiles set nome = $2, rm = $3, role = $4, local_id = $5 where id = $1", [
      u.id,
      u.nome,
      u.rm,
      u.role,
      u.local_id,
    ]);
  }
  await inserir("itens", dados.itens);
  await inserir("pedidos", dados.pedidos);
  await inserir("retiradas", dados.retiradas);
});

afterAll(async () => {
  await db?.close();
});

const alunoTeste = "a0000000-0000-4000-8000-000000000001";

describe("seed", () => {
  it("é determinístico", () => {
    const outra = gerarDadosDemo({ agora });
    expect(outra.itens.map((i) => i.id)).toEqual(dados.itens.map((i) => i.id));
  });

  it("fica coerente em qualquer hora de qualquer dia da semana em que o seed rodar", () => {
    const inicio = new Date("2026-10-19T00:30:00-03:00").getTime();
    for (let hora = 0; hora < 7 * 24; hora++) {
      const momento = new Date(inicio + hora * 60 * 60 * 1000);
      const d = gerarDadosDemo({ agora: momento });
      const retiradosValidos = new Set(d.retiradas.filter((r) => !r.desfeita_em).map((r) => r.item_id));
      const contagem = { recebido: 0, aguardando: 0, retirado: 0 };
      for (const item of d.itens) {
        const status = calcularStatus({
          encontradoEm: item.encontrado_em,
          temRetiradaValida: retiradosValidos.has(item.id),
          diasParaAguardando: 7,
          agora: momento,
        });
        contagem[status]++;
        expect(item.encontrado_em.getTime()).toBeLessThan(momento.getTime());
      }
      expect(contagem, momento.toISOString()).toEqual({
        recebido: d.resumo.recebidos,
        aguardando: d.resumo.aguardando,
        retirado: d.resumo.retirados,
      });
      const achadoEm = new Map(d.itens.map((i) => [i.id, i.encontrado_em.getTime()]));
      for (const r of d.retiradas) {
        expect(r.retirado_em.getTime()).toBeGreaterThan(achadoEm.get(r.item_id) ?? Infinity);
        expect(r.retirado_em.getTime()).toBeLessThan(momento.getTime());
      }
      for (const p of d.pedidos) {
        expect(p.created_at.getTime()).toBeGreaterThan(achadoEm.get(p.item_id) ?? Infinity);
      }
    }
  });

  it("tem as quantidades da especificação", () => {
    expect(dados.locais).toHaveLength(2);
    expect(dados.salas.length).toBeGreaterThanOrEqual(15);
    expect(dados.turmas.length).toBeGreaterThanOrEqual(10);
    expect(dados.categorias.map((c) => c.nome)).toEqual([
      "Celular",
      "Fone",
      "Notebook",
      "Carregador",
      "Garrafa",
      "Casaco",
      "Mochila",
      "Documento",
      "Guarda-chuva",
      "Outros",
    ]);
    expect(dados.usuarios.filter((u) => u.email.endsWith("@example.com"))).toHaveLength(dados.usuarios.length);
  });

  it("o status calculado pelo banco bate com o planejado", async () => {
    const { rows } = await db.query<{ status: string; total: number }>(
      "select status, count(*)::int as total from itens_com_status group by status order by status",
    );
    expect(Object.fromEntries(rows.map((r) => [r.status, r.total]))).toEqual({
      recebido: dados.resumo.recebidos,
      aguardando: dados.resumo.aguardando,
      retirado: dados.resumo.retirados,
    });
  });

  it("códigos seguem a ordem em que os itens foram encontrados", async () => {
    const { rows } = await db.query<{ codigo: string }>("select codigo from itens order by encontrado_em, numero");
    expect(rows[0]?.codigo).toBe("AP-0001");
    expect(rows.map((r) => r.codigo)).toEqual([...rows.map((r) => r.codigo)].sort());
  });

  it("datas são coerentes: nada no futuro, pedido e retirada depois do achado", async () => {
    const { rows } = await db.query<{ problemas: number }>(
      `select count(*)::int as problemas from itens i
       left join pedidos p on p.item_id = i.id
       left join retiradas r on r.item_id = i.id
       where i.encontrado_em > now()
          or p.created_at < i.encontrado_em or p.created_at > now()
          or r.retirado_em <= i.encontrado_em or r.retirado_em > now()
          or (r.pedido_id = p.id and p.created_at > r.retirado_em)`,
    );
    expect(rows[0]?.problemas).toBe(0);
  });

  it("retirada com pedido usa o RM e o nome de quem pediu", async () => {
    const { rows } = await db.query<{ divergentes: number }>(
      `select count(*)::int as divergentes from retiradas r
       join pedidos p on p.id = r.pedido_id
       join profiles a on a.id = p.aluno_id
       where r.rm <> a.rm or r.nome <> a.nome`,
    );
    expect(rows[0]?.divergentes).toBe(0);
  });

  it("tem uma retirada desfeita e um mês de dados para o dashboard", async () => {
    const { rows } = await db.query<{ desfeitas: number; dias: number }>(
      `select (select count(*)::int from retiradas where desfeita_em is not null) as desfeitas,
              (select count(distinct encontrado_em::date)::int from itens) as dias`,
    );
    expect(rows[0]?.desfeitas).toBe(1);
    expect(rows[0]?.dias).toBeGreaterThanOrEqual(15);
  });

  it("o Aluno Teste vê um pedido de cada status em Meus pedidos", async () => {
    const status = await comoUsuario(db, alunoTeste, async (tx) => {
      const { rows } = await tx.query<{ status: string }>("select status::text from meus_pedidos order by status::text");
      return rows.map((r) => r.status);
    });
    expect(status).toEqual(["encerrado", "pendente", "retirado"]);
  });

  it("há Documento entre os itens visíveis para o aluno, sempre sem foto", async () => {
    const docs = await comoUsuario(db, alunoTeste, async (tx) => {
      const { rows } = await tx.query<{ foto_path: string | null }>(
        "select b.foto_path from itens_busca b join categorias c on c.id = b.categoria_id where c.nome = 'Documento'",
      );
      return rows;
    });
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((d) => d.foto_path === null)).toBe(true);
  });
});
