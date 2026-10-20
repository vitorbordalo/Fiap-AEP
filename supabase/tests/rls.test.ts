// Testes das regras de acesso (RLS), triggers e views, num Postgres em memória.
// Cada teste roda numa transação desfeita no final; os dados-base são criados uma vez no beforeAll.

import type { PGlite, Transaction } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, criarBanco, entrarComo } from "../../scripts/db/pglite.mjs";

const ids = {
  aluno: "00000000-0000-4000-8000-000000000001",
  aluno2: "00000000-0000-4000-8000-000000000002",
  monitor: "00000000-0000-4000-8000-000000000003",
  equipe: "00000000-0000-4000-8000-000000000004",
  gestor: "00000000-0000-4000-8000-000000000005",
};

let db: PGlite;
let base: { local: string; sala: string; turma: string; fone: string; documento: string };
let itemFone: string;
let itemDocumento: string;

async function um<T>(tx: Transaction | PGlite, sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await tx.query<T>(sql, params);
  return rows[0] as T;
}

async function linhas<T>(tx: Transaction | PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await tx.query<T>(sql, params);
  return rows;
}

/** Espera que o comando falhe, sem abortar a transação do teste. */
async function esperaErro(tx: Transaction, sql: string, params: unknown[] = []): Promise<string> {
  await tx.exec("savepoint esperado");
  try {
    await tx.query(sql, params);
  } catch (erro) {
    await tx.exec("rollback to savepoint esperado");
    return erro instanceof Error ? erro.message : String(erro);
  }
  throw new Error(`Era esperado erro em: ${sql}`);
}

async function inserirItem(tx: Transaction | PGlite, categoria: string, extra: { foto?: string; obs?: string; dias?: number } = {}) {
  return um<{ id: string; codigo: string; cadastrado_por: string }>(
    tx,
    `insert into itens (foto_path, categoria_id, sala_id, turma_id, local_id, observacao, encontrado_em, cadastrado_por)
     values ($1, $2, $3, $4, $5, $6, now() - make_interval(days => $7), $8)
     returning id, codigo, cadastrado_por`,
    [
      extra.foto ?? `${ids.monitor}/${crypto.randomUUID()}.webp`,
      categoria,
      base.sala,
      base.turma,
      base.local,
      extra.obs ?? null,
      extra.dias ?? 0,
      ids.monitor,
    ],
  );
}

async function inserirPedido(tx: Transaction, itemId: string) {
  return um<{ id: string; aluno_id: string }>(
    tx,
    `insert into pedidos (item_id, sala_informada_id, turma_informada_id, horario_informado, confirmou_carteirinha)
     values ($1, $2, $3, '22:00', true) returning id, aluno_id`,
    [itemId, base.sala, base.turma],
  );
}

beforeAll(async () => {
  db = await criarBanco();

  for (const [papel, id] of Object.entries(ids)) {
    const email = papel.startsWith("aluno") ? `rm55${id.slice(-4)}@fiap.com.br` : `${papel}.teste@fiap.com.br`;
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  }
  await db.query("update profiles set role = 'monitor' where id = $1", [ids.monitor]);
  await db.query("update profiles set role = 'equipe' where id = $1", [ids.equipe]);
  await db.query("update profiles set role = 'gestor' where id = $1", [ids.gestor]);

  const local = await um<{ id: string }>(db, "insert into locais (nome) values ('Sala de TI') returning id");
  const sala = await um<{ id: string }>(db, "insert into salas (nome) values ('Sala 304') returning id");
  const turma = await um<{ id: string }>(db, "insert into turmas (nome) values ('2ESPH') returning id");
  const fone = await um<{ id: string }>(db, "insert into categorias (nome, icone) values ('Fone', 'headphones') returning id");
  const documento = await um<{ id: string }>(
    db,
    "insert into categorias (nome, icone, foto_sensivel) values ('Documento', 'id-card', true) returning id",
  );
  base = { local: local.id, sala: sala.id, turma: turma.id, fone: fone.id, documento: documento.id };

  itemFone = (await inserirItem(db, base.fone, { foto: `${ids.monitor}/fone.webp`, obs: "Fone preto" })).id;
  itemDocumento = (await inserirItem(db, base.documento, { foto: `${ids.monitor}/doc.webp`, obs: "RG de Fulano" })).id;
  await db.query(
    `insert into storage.objects (bucket_id, name, owner, owner_id) values
     ('itens', $1, $3::uuid, $3), ('itens', $2, $3::uuid, $3)`,
    [`${ids.monitor}/fone.webp`, `${ids.monitor}/doc.webp`, ids.monitor],
  );
});

afterAll(async () => {
  await db?.close();
});

describe("perfis", () => {
  it("todo usuário novo entra como aluno, com RM tirado do e-mail institucional", async () => {
    const perfil = await um<{ role: string; rm: string }>(db, "select role, rm from profiles where id = $1", [ids.aluno]);
    expect(perfil).toEqual({ role: "aluno", rm: "550001" });
  });

  it("aluno não consegue se promover", async () => {
    await comoUsuario(db, ids.aluno, async (tx) => {
      const erro = await esperaErro(tx, "update profiles set role = 'gestor' where id = $1", [ids.aluno]);
      expect(erro).toMatch(/coordenação/);
    });
  });

  it("aluno lê só o próprio perfil; equipe lê todos", async () => {
    const doAluno = await comoUsuario(db, ids.aluno, (tx) => linhas(tx, "select id from profiles"));
    expect(doAluno).toHaveLength(1);
    const daEquipe = await comoUsuario(db, ids.equipe, (tx) => linhas(tx, "select id from profiles"));
    expect(daEquipe).toHaveLength(5);
  });

  it("gestor altera o papel de outra pessoa", async () => {
    await comoUsuario(db, ids.gestor, async (tx) => {
      await tx.query("update profiles set role = 'monitor' where id = $1", [ids.aluno2]);
      const perfil = await um<{ role: string }>(tx, "select role from profiles where id = $1", [ids.aluno2]);
      expect(perfil.role).toBe("monitor");
    });
  });
});

describe("cadastro de itens", () => {
  it("monitor cadastra; autoria vem da sessão e o código é sequencial", async () => {
    await comoUsuario(db, ids.monitor, async (tx) => {
      const item = await um<{ codigo: string; cadastrado_por: string }>(
        tx,
        `insert into itens (foto_path, categoria_id, sala_id, local_id, cadastrado_por)
         values ('x.webp', $1, $2, $3, $4) returning codigo, cadastrado_por`,
        [base.fone, base.sala, base.local, ids.monitor],
      );
      expect(item.codigo).toBe("AP-0003");
      expect(item.cadastrado_por).toBe(ids.monitor);
    });
  });

  it("aluno não cadastra itens", async () => {
    await comoUsuario(db, ids.aluno, async (tx) => {
      const erro = await esperaErro(
        tx,
        "insert into itens (foto_path, categoria_id, sala_id, local_id, cadastrado_por) values ('x', $1, $2, $3, $4)",
        [base.fone, base.sala, base.local, ids.aluno],
      );
      expect(erro).toMatch(/row-level security/);
    });
  });

  it("observação tem no máximo 140 caracteres", async () => {
    await comoUsuario(db, ids.monitor, async (tx) => {
      const erro = await esperaErro(
        tx,
        "insert into itens (foto_path, categoria_id, sala_id, local_id, observacao) values ('x', $1, $2, $3, $4)",
        [base.fone, base.sala, base.local, "a".repeat(141)],
      );
      expect(erro).toMatch(/check constraint/);
    });
  });

  it("aluno não lê a tabela de itens; monitor lê só o que cadastrou", async () => {
    expect(await comoUsuario(db, ids.aluno, (tx) => linhas(tx, "select id from itens"))).toHaveLength(0);
    expect(await comoUsuario(db, ids.monitor, (tx) => linhas(tx, "select id from itens"))).toHaveLength(2);
    expect(await comoUsuario(db, ids.equipe, (tx) => linhas(tx, "select id from itens"))).toHaveLength(2);
  });
});

describe("busca do aluno (LGPD)", () => {
  it("Documento aparece sem foto e sem observação", async () => {
    const itens = await comoUsuario(db, ids.aluno, (tx) =>
      linhas<{ id: string; foto_path: string | null; observacao: string | null; foto_oculta: boolean }>(
        tx,
        "select id, foto_path, observacao, foto_oculta from itens_busca",
      ),
    );
    const doc = itens.find((i) => i.id === itemDocumento);
    const fone = itens.find((i) => i.id === itemFone);
    expect(doc).toMatchObject({ foto_path: null, observacao: null, foto_oculta: true });
    expect(fone).toMatchObject({ foto_path: `${ids.monitor}/fone.webp`, observacao: "Fone preto", foto_oculta: false });
  });

  it("aluno baixa a foto do fone, mas não a do documento", async () => {
    const fotos = await comoUsuario(db, ids.aluno, (tx) => linhas<{ name: string }>(tx, "select name from storage.objects"));
    expect(fotos.map((f) => f.name)).toEqual([`${ids.monitor}/fone.webp`]);
  });

  it("equipe vê todas as fotos; monitor só envia na própria pasta", async () => {
    expect(await comoUsuario(db, ids.equipe, (tx) => linhas(tx, "select name from storage.objects"))).toHaveLength(2);
    await comoUsuario(db, ids.monitor, async (tx) => {
      await tx.query("insert into storage.objects (bucket_id, name, owner_id) values ('itens', $1, $2)", [
        `${ids.monitor}/nova.webp`,
        ids.monitor,
      ]);
      const erro = await esperaErro(tx, "insert into storage.objects (bucket_id, name) values ('itens', $1)", [
        `${ids.equipe}/invasao.webp`,
      ]);
      expect(erro).toMatch(/row-level security/);
    });
  });
});

describe("pedidos e retiradas", () => {
  it("aluno pede um item; o pedido fica no nome dele mesmo se tentar forjar", async () => {
    await comoUsuario(db, ids.aluno, async (tx) => {
      const pedido = await um<{ aluno_id: string }>(
        tx,
        `insert into pedidos (item_id, aluno_id, sala_informada_id, turma_informada_id, horario_informado, confirmou_carteirinha)
         values ($1, $2, $3, $4, '22:00', true) returning aluno_id`,
        [itemFone, ids.aluno2, base.sala, base.turma],
      );
      expect(pedido.aluno_id).toBe(ids.aluno);
    });
  });

  it("aluno não vê pedidos de outro aluno nem retiradas", async () => {
    await comoUsuario(db, ids.aluno, async (tx) => {
      await inserirPedido(tx, itemFone);
      await entrarComo(tx, ids.aluno2);
      expect(await linhas(tx, "select id from pedidos")).toHaveLength(0);
      expect(await linhas(tx, "select id from meus_pedidos")).toHaveLength(0);
      expect(await linhas(tx, "select id from retiradas")).toHaveLength(0);
    });
  });

  it("fluxo completo: pedido, retirada, status calculado e desfazer", async () => {
    await comoUsuario(db, ids.aluno, async (tx) => {
      const pedido = await inserirPedido(tx, itemFone);
      await entrarComo(tx, ids.aluno2);
      await inserirPedido(tx, itemFone);

      await entrarComo(tx, ids.equipe);
      const semCarteirinha = await esperaErro(
        tx,
        "insert into retiradas (item_id, pedido_id, rm, nome, carteirinha_conferida) values ($1, $2, '550001', 'Aluno Teste', false)",
        [itemFone, pedido.id],
      );
      expect(semCarteirinha).toMatch(/check constraint|row-level security/);

      const retirada = await um<{ id: string; registrado_por: string }>(
        tx,
        "insert into retiradas (item_id, pedido_id, rm, nome, carteirinha_conferida) values ($1, $2, '550001', 'Aluno Teste', true) returning id, registrado_por",
        [itemFone, pedido.id],
      );
      expect(retirada.registrado_por).toBe(ids.equipe);
      expect(await um(tx, "select status from itens_com_status where id = $1", [itemFone])).toEqual({ status: "retirado" });

      const duplicada = await esperaErro(
        tx,
        "insert into retiradas (item_id, rm, nome, carteirinha_conferida) values ($1, '550002', 'Outra Pessoa', true)",
        [itemFone],
      );
      expect(duplicada).toMatch(/duplicate key|retiradas_uma_valida_por_item/);

      // quem pediu vê "retirado"; o outro aluno vê "encerrado", sem saber quem retirou
      await entrarComo(tx, ids.aluno);
      expect(await um(tx, "select status from meus_pedidos")).toEqual({ status: "retirado" });
      expect(await linhas(tx, "select id from itens_busca where id = $1", [itemFone])).toHaveLength(0);
      await entrarComo(tx, ids.aluno2);
      expect(await um(tx, "select status from meus_pedidos")).toEqual({ status: "encerrado" });

      // item retirado não aceita novos pedidos
      await entrarComo(tx, ids.gestor);
      const pedidoTardio = await esperaErro(
        tx,
        `insert into pedidos (item_id, sala_informada_id, turma_informada_id, horario_informado, confirmou_carteirinha)
         values ($1, $2, $3, '21:00', true)`,
        [itemFone, base.sala, base.turma],
      );
      expect(pedidoTardio).toMatch(/row-level security/);

      // desfazer: nunca apaga, só marca; não dá para editar nem desfazer duas vezes
      await entrarComo(tx, ids.equipe);
      expect(await esperaErro(tx, "update retiradas set rm = '999999' where id = $1", [retirada.id])).toMatch(/só desfeita/);
      expect(await esperaErro(tx, "delete from retiradas where id = $1", [retirada.id])).toMatch(/permission denied/);
      await tx.query("update retiradas set desfeita_em = now() where id = $1", [retirada.id]);
      const desfeita = await um<{ desfeita_por: string }>(tx, "select desfeita_por from retiradas where id = $1", [retirada.id]);
      expect(desfeita.desfeita_por).toBe(ids.equipe);
      expect(await esperaErro(tx, "update retiradas set desfeita_em = now() where id = $1", [retirada.id])).toMatch(/já foi desfeita/);
      expect(await um(tx, "select status from itens_com_status where id = $1", [itemFone])).toEqual({ status: "recebido" });
    });
  });

  it("aluno não registra retiradas", async () => {
    await comoUsuario(db, ids.aluno, async (tx) => {
      const erro = await esperaErro(
        tx,
        "insert into retiradas (item_id, rm, nome, carteirinha_conferida) values ($1, '550001', 'Aluno Teste', true)",
        [itemFone],
      );
      expect(erro).toMatch(/row-level security/);
    });
  });
});

describe("status pelo tempo no local", () => {
  it("passa de Recebido para Aguardando depois de N dias, e N vem das configurações", async () => {
    await comoUsuario(db, ids.gestor, async (tx) => {
      const seisDias = await inserirItem(tx, base.fone, { dias: 6 });
      const oitoDias = await inserirItem(tx, base.fone, { dias: 8 });
      const status = (id: string) => um<{ status: string }>(tx, "select status from itens_com_status where id = $1", [id]);

      expect(await status(seisDias.id)).toEqual({ status: "recebido" });
      expect(await status(oitoDias.id)).toEqual({ status: "aguardando" });

      await tx.query("update configuracoes set dias_para_aguardando = 5");
      expect(await status(seisDias.id)).toEqual({ status: "aguardando" });
    });
  });

  it("só o gestor altera as configurações", async () => {
    await comoUsuario(db, ids.equipe, async (tx) => {
      await tx.query("update configuracoes set dias_para_aguardando = 30");
      expect(await um(tx, "select dias_para_aguardando from configuracoes")).toEqual({ dias_para_aguardando: 7 });
    });
  });
});
