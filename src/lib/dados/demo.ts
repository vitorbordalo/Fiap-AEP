import "server-only";
import { gerarDadosDemo } from "@scripts/seed/dados.mjs";
import usuariosTeste from "@scripts/seed/usuarios-teste.json";
import { periodoDoDia } from "@/lib/dominio/periodo";
import { DIAS_PARA_AGUARDANDO_PADRAO } from "@/lib/dominio/status";
import { dataIso } from "@/lib/formato";
import type { Papel, Tables } from "@/lib/supabase/database.types";
import { carregarRetrato, DEMO_COMPARTILHADA, guardarFoto, guardarRetrato } from "./demo-compartilhado";
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
  resumirEquipe,
  retiradaValida,
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
 */

function criarBanco(): Retrato {
  const d = gerarDadosDemo();
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

// guardado no globalThis para sobreviver ao hot reload do `next dev`
const global = globalThis as typeof globalThis & { __bancoDemo?: Retrato };
function banco(): Retrato {
  global.__bancoDemo ??= criarBanco();
  return global.__bancoDemo;
}

/** Volta os dados ao estado inicial (usado pelos testes). */
export function reiniciarDemo() {
  global.__bancoDemo = criarBanco();
}

function exigir<T extends { id: string }>(lista: T[], id: string, mensagem: string) {
  const achado = lista.find((x) => x.id === id);
  if (!achado) throw new ErroDeNegocio(mensagem);
  return achado;
}

/** Perfil de teste usado pelo login de demonstração para cada papel; o nome digitado aparece nas telas. */
export async function perfilDeTeste(papel: Papel, nome: string): Promise<Tables<"profiles">> {
  if (DEMO_COMPARTILHADA) await carregarCompartilhado();
  const idDeTeste = usuariosTeste.find((u) => u.role === papel)?.id;
  const perfil = banco().perfis.find((p) => p.id === idDeTeste);
  if (!perfil) throw new Error(`Sem perfil de teste para ${papel}`);
  if (nome && perfil.nome !== nome) {
    perfil.nome = nome;
    // as outras telas (ex.: o pedido visto pela equipe) mostram o mesmo nome
    if (DEMO_COMPARTILHADA) await guardarCompartilhado();
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

function meuPedido(p: PedidoLinha): MeuPedido {
  const b = banco();
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

const operacoes: Repositorio = {
  async catalogo() {
    return catalogoDe(banco());
  },

  // ---------------------------------------------------------------- aluno

  async buscarItensPublicos(filtro) {
    const b = banco();
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

  async obterItemPublico(id) {
    const b = banco();
    const item = b.itens.find((i) => i.id === id);
    if (!item || retiradaValida(b, item.id)) return null;
    return montarItemPublico(b, item);
  },

  async pedidoDoAluno(alunoId, itemId) {
    return banco().pedidos.find((p) => p.alunoId === alunoId && p.itemId === itemId)?.id ?? null;
  },

  async criarPedido(alunoId, novo) {
    const b = banco();
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

  async listarMeusPedidos(alunoId) {
    return banco()
      .pedidos.filter((p) => p.alunoId === alunoId)
      .sort((a, z) => z.criadoEm.getTime() - a.criadoEm.getTime())
      .map(meuPedido);
  },

  async obterMeuPedido(alunoId, pedidoId) {
    const pedido = banco().pedidos.find((p) => p.id === pedidoId && p.alunoId === alunoId);
    return pedido ? meuPedido(pedido) : null;
  },

  // ---------------------------------------------------------------- cadastro

  async salvarFoto(_autorId, foto) {
    // em memória: a própria imagem vira o "caminho"; na Vercel, ela fica guardada à parte
    const dataUrl = `data:${foto.type};base64,${Buffer.from(await foto.arrayBuffer()).toString("base64")}`;
    return DEMO_COMPARTILHADA ? guardarFoto(dataUrl) : dataUrl;
  },

  async cadastrarItem(autorId, novo) {
    const b = banco();
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

  async obterItemCadastrado(autorId, id) {
    const b = banco();
    // o monitor só vê os itens que ele mesmo cadastrou (igual à policy do banco)
    const item = b.itens.find((i) => i.id === id && i.cadastradoPor === autorId);
    return item ? montarItemEquipe(b, item) : null;
  },

  // ---------------------------------------------------------------- equipe

  async listarItensEquipe(filtro) {
    return filtrarItensEquipe(banco(), filtro);
  },

  async resumoEquipe(localId) {
    return resumirEquipe(banco(), localId);
  },

  async obterItemDetalhe(id) {
    const b = banco();
    const item = b.itens.find((i) => i.id === id);
    return item ? montarDetalhe(b, item) : null;
  },

  async registrarRetirada(equipeId, nova) {
    const b = banco();
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

  async desfazerRetirada(equipeId, retiradaId) {
    const retirada = exigir(banco().retiradas, retiradaId, "Retirada não encontrada.");
    if (retirada.desfeitaEm) throw new ErroDeNegocio("Esta retirada já foi desfeita.");
    retirada.desfeitaEm = new Date();
    retirada.desfeitaPor = equipeId;
    return { itemId: retirada.itemId };
  },

  // ---------------------------------------------------------------- gestor

  async dashboard(localId, periodo) {
    return calcularDashboard(banco(), localId, periodo);
  },

  async historico(filtro) {
    return filtrarHistorico(banco(), filtro);
  },

  async configuracoes() {
    return montarConfiguracoes(banco());
  },

  async atualizarDiasParaAguardando(dias) {
    banco().diasParaAguardando = dias;
  },

  async alterarPessoa(id, papel, localId) {
    const perfil = exigir(banco().perfis, id, "Pessoa não encontrada.");
    perfil.papel = papel;
    perfil.localId = papel === "equipe" ? localId : null;
  },

  async definirPapelPorEmail(email, papel, localId) {
    const b = banco();
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

/** Operações que alteram os dados: na Vercel, o retrato é guardado de volta depois delas. */
const ESCRITAS = new Set<string>([
  "criarPedido",
  "cadastrarItem",
  "registrarRetirada",
  "desfazerRetirada",
  "atualizarDiasParaAguardando",
  "alterarPessoa",
  "definirPapelPorEmail",
] satisfies (keyof Repositorio)[]);

async function carregarCompartilhado() {
  try {
    global.__bancoDemo = (await carregarRetrato()) ?? banco();
  } catch (erro) {
    // sem o cache, a demonstração segue com a memória desta instância
    console.error("Demonstração: não foi possível ler o retrato compartilhado.", erro);
  }
}

async function guardarCompartilhado() {
  await guardarRetrato(banco()).catch((erro) => console.error("Demonstração: não foi possível guardar o retrato.", erro));
}

async function comRetratoCompartilhado<T>(operacao: () => Promise<T>, escreve: boolean): Promise<T> {
  await carregarCompartilhado();
  const resultado = await operacao();
  if (escreve) await guardarCompartilhado();
  return resultado;
}

export const repositorioDemo: Repositorio = DEMO_COMPARTILHADA
  ? (Object.fromEntries(
      Object.entries(operacoes).map(([nome, operacao]) => [
        nome,
        (...args: unknown[]) =>
          comRetratoCompartilhado(() => (operacao as (...a: unknown[]) => Promise<unknown>)(...args), ESCRITAS.has(nome)),
      ]),
    ) as Repositorio)
  : operacoes;
