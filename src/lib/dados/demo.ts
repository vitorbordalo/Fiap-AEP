import "server-only";
import { gerarDadosDemo } from "@scripts/seed/dados.mjs";
import usuariosTeste from "@scripts/seed/usuarios-teste.json";
import { periodoDoDia } from "@/lib/dominio/periodo";
import { DIAS_PARA_AGUARDANDO_PADRAO } from "@/lib/dominio/status";
import { dataIso } from "@/lib/formato";
import type { Papel, Tables } from "@/lib/supabase/database.types";
import { abrirRetrato, DEMO_COMPARTILHADA, guardarFoto, guardarRetrato, type Armazenamento } from "./demo-compartilhado";
import {
  calcularDashboard,
  catalogoDe,
  codigoDoNumero,
  filtrarHistorico,
  filtrarItensEquipe,
  montarConfiguracoes,
  montarDetalhe,
  montarItemEquipe,
  montarItemPublico,
  retiradaValida,
  resumirEquipe,
  type ItemLinha,
  type PedidoLinha,
  type Retrato,
  type RetiradaLinha,
} from "./montagem";
import { ErroDeNegocio, type MeuPedido, type Repositorio } from "./tipos";

/**
 * Repositório em memória do modo demonstração. Começa com os dados do seed (scripts/seed/dados.mjs)
 * e aceita cadastros, pedidos e retiradas. Tudo volta ao início quando o servidor reinicia.
 * Na Vercel, o retrato é compartilhado entre as funções pela Runtime Cache (demo-compartilhado.ts).
 * Repete as regras que o banco garante (uma retirada válida por item, pedido só de item disponível,
 * retirada só desfeita uma vez).
 *
 * Cada operação recebe o retrato em que trabalha: localmente é sempre o mesmo (memória do processo);
 * na Vercel, cada chamada lê o seu, e requisições simultâneas na mesma instância não se atropelam.
 */

export function criarRetratoInicial(agora = new Date()): Retrato {
  const d = gerarDadosDemo({ agora });
  return {
    categorias: d.categorias.map((c) => ({ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor, fotoSensivel: c.foto_sensivel })),
    salas: d.salas.map(({ id, nome }) => ({ id, nome })),
    turmas: d.turmas.map(({ id, nome }) => ({ id, nome })),
    locais: d.locais.map((l) => ({ id: l.id, nome: l.nome, horarioRetirada: l.horario_retirada })),
    perfis: d.usuarios.map((u) => ({ id: u.id, email: u.email, nome: u.nome, rm: u.rm, papel: u.role, localId: u.local_id })),
    itens: d.itens.map((i, indice) => ({
      id: i.id,
      numero: indice + 1,
      fotoUrl: `/${i.foto_path}`,
      categoriaId: i.categoria_id,
      salaId: i.sala_id,
      turmaId: i.turma_id,
      encontradoEm: i.encontrado_em,
      observacao: i.observacao,
      localId: i.local_id,
      cadastradoPor: i.cadastrado_por,
      criadoEm: i.created_at,
    })),
    pedidos: d.pedidos.map((p) => ({
      id: p.id,
      itemId: p.item_id,
      alunoId: p.aluno_id,
      salaId: p.sala_informada_id,
      turmaId: p.turma_informada_id,
      horario: p.horario_informado,
      criadoEm: p.created_at,
    })),
    retiradas: d.retiradas.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      pedidoId: r.pedido_id,
      rm: r.rm,
      nome: r.nome,
      registradoPor: r.registrado_por,
      retiradoEm: r.retirado_em,
      desfeitaEm: r.desfeita_em,
      desfeitaPor: r.desfeita_por,
    })),
    diasParaAguardando: DIAS_PARA_AGUARDANDO_PADRAO,
  };
}

function exigir<T extends { id: string }>(lista: T[], id: string, mensagem: string) {
  const achado = lista.find((x) => x.id === id);
  if (!achado) throw new ErroDeNegocio(mensagem);
  return achado;
}

function meuPedido(b: Retrato, p: PedidoLinha): MeuPedido {
  const item = exigir(b.itens, p.itemId, "Item não encontrado.");
  const retirada = retiradaValida(b, p.itemId);
  return {
    id: p.id,
    item: montarItemPublico(b, item),
    salaInformada: exigir(b.salas, p.salaId, "Sala não encontrada."),
    turmaInformada: exigir(b.turmas, p.turmaId, "Turma não encontrada."),
    horarioInformado: p.horario,
    criadoEm: p.criadoEm,
    situacao: !retirada ? "pendente" : retirada.pedidoId === p.id ? "retirado" : "encerrado",
  };
}

/** Cada operação do contrato Repositorio, com o retrato em que ela trabalha como primeiro argumento. */
type Operacoes = {
  [Nome in keyof Repositorio]: (b: Retrato, ...args: Parameters<Repositorio[Nome]>) => ReturnType<Repositorio[Nome]>;
};

/** Operações que alteram os dados: na Vercel, o retrato é guardado de volta depois delas. */
const ESCRITAS = new Set<keyof Repositorio>([
  "criarPedido",
  "cadastrarItem",
  "registrarRetirada",
  "desfazerRetirada",
  "atualizarDiasParaAguardando",
  "alterarPessoa",
  "definirPapelPorEmail",
]);

const operacoes: Operacoes = {
  async catalogo(b) {
    return catalogoDe(b);
  },

  // ---------------------------------------------------------------- aluno

  async buscarItensPublicos(b, filtro) {
    return b.itens
      .filter((item) => !retiradaValida(b, item.id))
      .filter((item) => !filtro.data || dataIso(item.encontradoEm) === filtro.data)
      .filter((item) => !filtro.periodo || periodoDoDia(item.encontradoEm) === filtro.periodo)
      .filter((item) => !filtro.salaId || item.salaId === filtro.salaId)
      .filter((item) => !filtro.categoriaId || item.categoriaId === filtro.categoriaId)
      // mais recentes primeiro; no mesmo minuto, o cadastrado por último
      .sort((a, z) => z.encontradoEm.getTime() - a.encontradoEm.getTime() || z.numero - a.numero)
      .map((item) => montarItemPublico(b, item));
  },

  async obterItemPublico(b, id) {
    const item = b.itens.find((i) => i.id === id);
    if (!item || retiradaValida(b, item.id)) return null;
    return montarItemPublico(b, item);
  },

  async pedidoDoAluno(b, alunoId, itemId) {
    return b.pedidos.find((p) => p.alunoId === alunoId && p.itemId === itemId)?.id ?? null;
  },

  async criarPedido(b, alunoId, novo) {
    const item = b.itens.find((i) => i.id === novo.itemId);
    if (!item || retiradaValida(b, item.id)) throw new ErroDeNegocio("Este item não está mais disponível.");
    const existente = b.pedidos.find((p) => p.alunoId === alunoId && p.itemId === novo.itemId);
    if (existente) return { id: existente.id };

    exigir(b.salas, novo.salaId, "Sala inválida.");
    exigir(b.turmas, novo.turmaId, "Turma inválida.");
    const pedido: PedidoLinha = {
      id: crypto.randomUUID(),
      itemId: novo.itemId,
      alunoId,
      salaId: novo.salaId,
      turmaId: novo.turmaId,
      horario: novo.horario,
      criadoEm: new Date(),
    };
    b.pedidos.push(pedido);
    return { id: pedido.id };
  },

  async listarMeusPedidos(b, alunoId) {
    return b.pedidos
      .filter((p) => p.alunoId === alunoId)
      .sort((a, z) => z.criadoEm.getTime() - a.criadoEm.getTime())
      .map((p) => meuPedido(b, p));
  },

  async obterMeuPedido(b, alunoId, pedidoId) {
    const pedido = b.pedidos.find((p) => p.id === pedidoId && p.alunoId === alunoId);
    return pedido ? meuPedido(b, pedido) : null;
  },

  // ---------------------------------------------------------------- cadastro

  async salvarFoto(_b, _autorId, foto) {
    // em memória: a própria imagem vira o "caminho"; na Vercel, ela fica guardada à parte
    const dataUrl = `data:${foto.type};base64,${Buffer.from(await foto.arrayBuffer()).toString("base64")}`;
    return DEMO_COMPARTILHADA ? guardarFoto(dataUrl) : dataUrl;
  },

  async cadastrarItem(b, autorId, novo) {
    exigir(b.categorias, novo.categoriaId, "Categoria inválida.");
    exigir(b.salas, novo.salaId, "Sala inválida.");
    exigir(b.locais, novo.localId, "Local inválido.");
    if (novo.turmaId) exigir(b.turmas, novo.turmaId, "Turma inválida.");

    const agora = new Date();
    if (novo.encontradoEm.getTime() > agora.getTime() + 5 * 60 * 1000) {
      throw new ErroDeNegocio("A data e hora não podem estar no futuro.");
    }

    const numero = Math.max(0, ...b.itens.map((i) => i.numero)) + 1;
    const item: ItemLinha = {
      id: crypto.randomUUID(),
      numero,
      fotoUrl: novo.fotoPath,
      categoriaId: novo.categoriaId,
      salaId: novo.salaId,
      turmaId: novo.turmaId,
      encontradoEm: novo.encontradoEm,
      observacao: novo.observacao,
      localId: novo.localId,
      cadastradoPor: autorId,
      criadoEm: agora,
    };
    b.itens.push(item);
    return { id: item.id, codigo: codigoDoNumero(numero) };
  },

  async obterItemCadastrado(b, autorId, id) {
    // o monitor só vê os itens que ele mesmo cadastrou (igual à policy do banco)
    const item = b.itens.find((i) => i.id === id && i.cadastradoPor === autorId);
    return item ? montarItemEquipe(b, item) : null;
  },

  // ---------------------------------------------------------------- equipe

  async listarItensEquipe(b, filtro) {
    return filtrarItensEquipe(b, filtro);
  },

  async resumoEquipe(b, localId) {
    return resumirEquipe(b, localId);
  },

  async obterItemDetalhe(b, id) {
    const item = b.itens.find((i) => i.id === id);
    return item ? montarDetalhe(b, item) : null;
  },

  async registrarRetirada(b, equipeId, nova) {
    const item = exigir(b.itens, nova.itemId, "Item não encontrado.");
    if (retiradaValida(b, item.id)) throw new ErroDeNegocio("Este item já foi retirado.");
    if (nova.pedidoId && !b.pedidos.some((p) => p.id === nova.pedidoId && p.itemId === item.id)) {
      throw new ErroDeNegocio("Este pedido não é deste item.");
    }
    const retirada: RetiradaLinha = {
      id: crypto.randomUUID(),
      itemId: item.id,
      pedidoId: nova.pedidoId,
      rm: nova.rm,
      nome: nova.nome,
      registradoPor: equipeId,
      retiradoEm: new Date(),
      desfeitaEm: null,
      desfeitaPor: null,
    };
    b.retiradas.push(retirada);
    return { id: retirada.id };
  },

  async desfazerRetirada(b, equipeId, retiradaId) {
    const retirada = exigir(b.retiradas, retiradaId, "Retirada não encontrada.");
    if (retirada.desfeitaEm) throw new ErroDeNegocio("Esta retirada já foi desfeita.");
    retirada.desfeitaEm = new Date();
    retirada.desfeitaPor = equipeId;
    return { itemId: retirada.itemId };
  },

  // ---------------------------------------------------------------- gestor

  async dashboard(b, localId, periodo) {
    return calcularDashboard(b, localId, periodo);
  },

  async historico(b, filtro) {
    return filtrarHistorico(b, filtro);
  },

  async configuracoes(b) {
    return montarConfiguracoes(b);
  },

  async atualizarDiasParaAguardando(b, dias) {
    b.diasParaAguardando = dias;
  },

  async alterarPessoa(b, id, papel, localId) {
    const perfil = exigir(b.perfis, id, "Pessoa não encontrada.");
    perfil.papel = papel;
    perfil.localId = papel === "equipe" ? localId : null;
  },

  async definirPapelPorEmail(b, email, papel, localId) {
    const existente = b.perfis.find((p) => p.email === email);
    if (existente) {
      existente.papel = papel;
      existente.localId = papel === "equipe" ? localId : null;
      return;
    }
    const usuario = email.split("@")[0] ?? email;
    b.perfis.push({
      id: crypto.randomUUID(),
      email,
      nome: usuario.replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      rm: /^rm(\d{4,10})$/i.exec(usuario)?.[1] ?? null,
      papel,
      localId: papel === "equipe" ? localId : null,
    });
  },
};

// ---------------------------------------------------------------------------
// Onde o retrato mora
// ---------------------------------------------------------------------------

/** Dá a cada operação o retrato em que trabalhar e guarda as alterações depois dela. */
export type Sessao = <T>(operacao: (b: Retrato) => Promise<T>, escreve: boolean) => Promise<T>;

/** Liga as operações a uma sessão: o resultado cumpre o contrato Repositorio. */
export function criarRepositorioDemo(sessao: Sessao): Repositorio {
  return Object.fromEntries(
    Object.entries(operacoes).map(([nome, operacao]) => [
      nome,
      (...args: unknown[]) =>
        sessao((b) => (operacao as (b: Retrato, ...a: unknown[]) => Promise<unknown>)(b, ...args), ESCRITAS.has(nome as keyof Repositorio)),
    ]),
  ) as Repositorio;
}

// guardado no globalThis para sobreviver ao hot reload do `next dev`
const global = globalThis as typeof globalThis & { __bancoDemo?: Retrato };
function retratoLocal(): Retrato {
  global.__bancoDemo ??= criarRetratoInicial();
  return global.__bancoDemo;
}

/** Volta os dados ao estado inicial (usado pelos testes). */
export function reiniciarDemo() {
  global.__bancoDemo = criarRetratoInicial();
}

/** Local: a memória do processo, sempre o mesmo retrato. */
const sessaoLocal: Sessao = (operacao) => operacao(retratoLocal());

/**
 * Vercel: cada chamada lê o retrato compartilhado (ou o semeia) e, se alterou algo, guarda de volta.
 * Se a Runtime Cache falhar, a demonstração segue com o último retrato que esta instância viu.
 * Sem `cache`, usa a Runtime Cache; os testes passam um armazenamento em memória.
 */
export function criarSessaoCompartilhada(cache?: Armazenamento): Sessao {
  return async (operacao, escreve) => {
    let b: Retrato;
    try {
      b = await abrirRetrato(() => criarRetratoInicial(), cache);
      global.__bancoDemo = b;
    } catch (erro) {
      console.error("Demonstração: não foi possível ler o retrato compartilhado.", erro);
      b = retratoLocal();
    }
    const resultado = await operacao(b);
    if (escreve) {
      await guardarRetrato(b, cache).catch((erro) => console.error("Demonstração: não foi possível guardar o retrato.", erro));
    }
    return resultado;
  };
}

const sessao = DEMO_COMPARTILHADA ? criarSessaoCompartilhada() : sessaoLocal;

export const repositorioDemo: Repositorio = criarRepositorioDemo(sessao);

/** Perfil de teste usado pelo login de demonstração para cada papel; o nome digitado aparece nas telas. */
export async function perfilDeTeste(papel: Papel, nome: string): Promise<Tables<"profiles">> {
  const idDeTeste = usuariosTeste.find((u) => u.role === papel)?.id;
  const procurar = (b: Retrato) => {
    const perfil = b.perfis.find((p) => p.id === idDeTeste);
    if (!perfil) throw new Error(`Sem perfil de teste para ${papel}`);
    return perfil;
  };

  let perfil = await sessao(async (b) => ({ ...procurar(b) }), false);
  if (nome && perfil.nome !== nome) {
    // as outras telas (ex.: o pedido visto pela equipe) mostram o mesmo nome
    perfil = await sessao(async (b) => {
      const doRetrato = procurar(b);
      doRetrato.nome = nome;
      return { ...doRetrato };
    }, true);
  }

  return {
    id: perfil.id,
    email: perfil.email,
    nome: perfil.nome,
    rm: perfil.rm,
    // o cookie da sessão manda no papel: evita loop de redirecionamento se o gestor mudar o perfil em G3
    role: papel,
    local_id: perfil.localId,
    created_at: new Date(0).toISOString(),
  };
}
