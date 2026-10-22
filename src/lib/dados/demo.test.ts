import { beforeEach, describe, expect, it, vi } from "vitest";
import usuariosTeste from "@scripts/seed/usuarios-teste.json";
import { abrirRetrato, carregarRetrato, guardarFoto, guardarRetrato, type Armazenamento } from "./demo-compartilhado";
import { criarRepositorioDemo, criarRetratoInicial, criarSessaoCompartilhada, type Sessao } from "./demo";
import type { Retrato } from "./montagem";
import { ErroDeNegocio, type Catalogo, type Repositorio } from "./tipos";

/** Runtime Cache de mentira: um Map que guarda o que a Vercel guardaria. */
function cacheEmMemoria(): Armazenamento & { chaves: Map<string, unknown> } {
  const chaves = new Map<string, unknown>();
  return {
    chaves,
    get: async (chave) => chaves.get(chave) ?? null,
    set: async (chave, valor) => void chaves.set(chave, valor),
  };
}

const idDe = (papel: string) => usuariosTeste.find((u) => u.role === papel)?.id as string;
const MONITOR = idDe("monitor");
const ALUNO = idDe("aluno");
const EQUIPE = idDe("equipe");

/** Um retrato próprio por teste: as regras não dependem da ordem dos testes. */
function repositorioIsolado() {
  const retrato = criarRetratoInicial();
  const sessao: Sessao = (operacao) => operacao(retrato);
  return { repo: criarRepositorioDemo(sessao), retrato };
}

function novoItem(r: Catalogo, extra: Partial<Parameters<Repositorio["cadastrarItem"]>[1]> = {}) {
  const [categoria, sala, local] = [r.categorias[0], r.salas[0], r.locais[0]];
  if (!categoria || !sala || !local) throw new Error("seed sem catálogo");
  return {
    fotoPath: "/seed/package.svg",
    categoriaId: categoria.id,
    salaId: sala.id,
    turmaId: null,
    encontradoEm: new Date(),
    observacao: null,
    localId: local.id,
    ...extra,
  };
}

function novoPedido(r: Catalogo, itemId: string) {
  return { itemId, salaId: r.salas[0]?.id as string, turmaId: r.turmas[0]?.id as string, horario: "10:00" };
}

describe("repositório da demonstração: regras que o banco garante", () => {
  let repo: Repositorio;
  let retrato: Retrato;
  beforeEach(() => ({ repo, retrato } = repositorioIsolado()));

  it("cadastra com código sequencial e recusa data no futuro", async () => {
    const maior = Math.max(...retrato.itens.map((i) => i.numero));
    const { codigo } = await repo.cadastrarItem(MONITOR, novoItem(retrato));
    expect(codigo).toBe(`AP-${String(maior + 1).padStart(4, "0")}`);

    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await expect(repo.cadastrarItem(MONITOR, novoItem(retrato, { encontradoEm: amanha }))).rejects.toThrow(ErroDeNegocio);
  });

  it("o monitor só vê o item que ele mesmo cadastrou", async () => {
    const { id } = await repo.cadastrarItem(MONITOR, novoItem(retrato));
    expect(await repo.obterItemCadastrado(MONITOR, id)).not.toBeNull();
    expect(await repo.obterItemCadastrado(EQUIPE, id)).toBeNull();
  });

  it("pedido repetido devolve o mesmo pedido; item retirado não aceita pedido", async () => {
    const { id: itemId } = await repo.cadastrarItem(MONITOR, novoItem(retrato));
    const primeiro = await repo.criarPedido(ALUNO, novoPedido(retrato, itemId));
    expect(await repo.criarPedido(ALUNO, novoPedido(retrato, itemId))).toEqual(primeiro);

    await repo.registrarRetirada(EQUIPE, { itemId, pedidoId: primeiro.id, rm: "550123", nome: "Aluno Teste" });
    const { id: outroItem } = await repo.cadastrarItem(MONITOR, novoItem(retrato));
    await repo.registrarRetirada(EQUIPE, { itemId: outroItem, pedidoId: null, rm: "550124", nome: "Outro Aluno" });
    await expect(repo.criarPedido(ALUNO, novoPedido(retrato, outroItem))).rejects.toThrow("não está mais disponível");
  });

  it("uma retirada válida por item; pedido de outro item é recusado", async () => {
    const { id: itemId } = await repo.cadastrarItem(MONITOR, novoItem(retrato));
    const { id: outroItem } = await repo.cadastrarItem(MONITOR, novoItem(retrato));
    const pedidoDoOutro = await repo.criarPedido(ALUNO, novoPedido(retrato, outroItem));

    await expect(
      repo.registrarRetirada(EQUIPE, { itemId, pedidoId: pedidoDoOutro.id, rm: "550123", nome: "Aluno Teste" }),
    ).rejects.toThrow("não é deste item");

    await repo.registrarRetirada(EQUIPE, { itemId, pedidoId: null, rm: "550123", nome: "Aluno Teste" });
    await expect(repo.registrarRetirada(EQUIPE, { itemId, pedidoId: null, rm: "550123", nome: "Aluno Teste" })).rejects.toThrow(
      "já foi retirado",
    );
  });

  it("desfazer a retirada devolve o item à busca do aluno, e só uma vez", async () => {
    const { id: itemId } = await repo.cadastrarItem(MONITOR, novoItem(retrato));
    const { id: retiradaId } = await repo.registrarRetirada(EQUIPE, { itemId, pedidoId: null, rm: "550123", nome: "Aluno Teste" });
    expect(await repo.obterItemPublico(itemId)).toBeNull();

    await repo.desfazerRetirada(EQUIPE, retiradaId);
    expect(await repo.obterItemPublico(itemId)).not.toBeNull();
    // o histórico guarda a retirada desfeita: nada é apagado
    expect((await repo.obterItemDetalhe(itemId))?.retiradas).toHaveLength(1);
    await expect(repo.desfazerRetirada(EQUIPE, retiradaId)).rejects.toThrow("já foi desfeita");
  });

  it("documento aparece para o aluno sem foto e sem observação (LGPD)", async () => {
    const documento = retrato.categorias.find((c) => c.fotoSensivel);
    if (!documento) throw new Error("seed sem categoria sensível");
    const { id } = await repo.cadastrarItem(MONITOR, novoItem(retrato, { categoriaId: documento.id, observacao: "RG" }));
    const publico = await repo.obterItemPublico(id);
    expect(publico).toMatchObject({ fotoUrl: null, fotoOculta: true, observacao: null });
  });
});

describe("demonstração compartilhada (Vercel)", () => {
  it("sem retrato guardado, semeia e já guarda: todas as instâncias passam a ler o mesmo", async () => {
    const cache = cacheEmMemoria();
    const primeiro = await abrirRetrato(() => criarRetratoInicial(), cache);
    expect(cache.chaves.size).toBe(1);

    const segundo = await abrirRetrato(() => {
      throw new Error("não deveria semear de novo");
    }, cache);
    expect(segundo.itens.map((i) => i.id)).toEqual(primeiro.itens.map((i) => i.id));
  });

  it("o que uma instância grava, a outra lê", async () => {
    const cache = cacheEmMemoria();
    const instanciaA = criarRepositorioDemo(criarSessaoCompartilhada(cache));
    const instanciaB = criarRepositorioDemo(criarSessaoCompartilhada(cache));

    const r = await instanciaA.catalogo();
    const { id } = await instanciaA.cadastrarItem(MONITOR, novoItem(r));
    expect(await instanciaB.obterItemDetalhe(id)).toMatchObject({ id });
  });

  it("chamadas simultâneas não perdem o cadastro uma da outra na mesma instância", async () => {
    const cache = cacheEmMemoria();
    const repo = criarRepositorioDemo(criarSessaoCompartilhada(cache));
    const r = await repo.catalogo();

    // leitura e escrita ao mesmo tempo (ex.: prefetch de uma tela enquanto a Server Action grava)
    const [, { id }] = await Promise.all([repo.listarItensEquipe({ localId: null }), repo.cadastrarItem(MONITOR, novoItem(r))]);
    expect(await repo.obterItemDetalhe(id)).not.toBeNull();
  });

  it("a foto fica à parte do retrato e volta como data URL ao carregar", async () => {
    const cache = cacheEmMemoria();
    const retrato = await abrirRetrato(() => criarRetratoInicial(), cache);
    const item = retrato.itens[0];
    if (!item) throw new Error("seed sem itens");

    const dataUrl = "data:image/webp;base64,AAAA";
    item.fotoUrl = await guardarFoto(dataUrl, cache);
    await guardarRetrato(retrato, cache);

    const carregado = await carregarRetrato(cache);
    expect(carregado?.itens[0]?.fotoUrl).toBe(dataUrl);

    // guardar de novo mantém só o marcador no retrato (a foto não entra nos 2 MB da chave)
    if (!carregado) throw new Error("retrato sumiu");
    await guardarRetrato(carregado, cache);
    const texto = [...cache.chaves.entries()].find(([chave]) => chave.endsWith(":retrato"))?.[1] as string;
    expect(texto).not.toContain(dataUrl);
  });

  it("foto recusada pelo cache não derruba o cadastro: o item mostra a ilustração da categoria", async () => {
    const cache = cacheEmMemoria();
    const retrato = await abrirRetrato(() => criarRetratoInicial(), cache);
    const item = retrato.itens[0];
    if (!item) throw new Error("seed sem itens");

    const recusaFotos: Armazenamento = {
      get: cache.get,
      set: async (chave, valor, opcoes) => {
        if (!chave.endsWith(":retrato")) throw new Error("item maior que 2 MB");
        return cache.set(chave, valor, opcoes);
      },
    };
    const marcador = await guardarFoto("data:image/jpeg;base64,BBBB", recusaFotos);
    item.fotoUrl = marcador;
    await guardarRetrato(retrato, cache);

    // outra instância (sem a foto na memória) lê o retrato: cai na ilustração
    vi.resetModules();
    const { carregarRetrato: carregarEmOutraInstancia } = await import("./demo-compartilhado");
    const icone = retrato.categorias.find((c) => c.id === item.categoriaId)?.icone;
    expect((await carregarEmOutraInstancia(cache))?.itens[0]?.fotoUrl).toBe(`/seed/${icone}.svg`);
  });
});
