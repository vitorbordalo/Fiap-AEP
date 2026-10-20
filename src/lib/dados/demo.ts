import "server-only";
import { gerarDadosDemo } from "@scripts/seed/dados.mjs";
import usuariosTeste from "@scripts/seed/usuarios-teste.json";
import { conferir } from "@/lib/dominio/conferencia";
import { periodoDoDia, PERIODOS } from "@/lib/dominio/periodo";
import { calcularStatus, DIAS_PARA_AGUARDANDO_PADRAO, type ItemStatus } from "@/lib/dominio/status";
import { dataIso, diaDaSemanaLocal, formatarMesAno, normalizar } from "@/lib/formato";
import type { Papel } from "@/lib/supabase/database.types";
import {
  ErroDeNegocio,
  type Catalogo,
  type Categoria,
  type Configuracoes,
  type Dashboard,
  type EventoHistorico,
  type FiltroBuscaAluno,
  type FiltroHistorico,
  type FiltroItensEquipe,
  type ItemDetalhe,
  type ItemEquipe,
  type ItemPublico,
  type LinhaHistorico,
  type Local,
  type MeuPedido,
  type NovaRetirada,
  type NovoItem,
  type NovoPedido,
  type Opcao,
  type PedidoDoItem,
  type PeriodoRelatorio,
  type Pessoa,
  type ResumoEquipe,
  type Retirada,
  type SituacaoPedido,
} from "./tipos";

/**
 * Repositório em memória do modo demonstração. Começa com os dados do seed (scripts/seed/dados.mjs)
 * e aceita cadastros, pedidos e retiradas. Tudo volta ao início quando o servidor reinicia.
 * Repete as regras do banco (status calculado, uma retirada válida por item, Documento sem foto para alunos).
 */

type PerfilDemo = { id: string; email: string; nome: string; rm: string | null; papel: Papel; localId: string | null };
type ItemDb = {
  id: string;
  numero: number;
  fotoUrl: string;
  categoriaId: string;
  salaId: string;
  turmaId: string | null;
  encontradoEm: Date;
  observacao: string | null;
  localId: string;
  cadastradoPor: string;
  criadoEm: Date;
};
type PedidoDb = {
  id: string;
  itemId: string;
  alunoId: string;
  salaId: string;
  turmaId: string;
  horario: string;
  criadoEm: Date;
};
type RetiradaDb = {
  id: string;
  itemId: string;
  pedidoId: string | null;
  rm: string;
  nome: string;
  registradoPor: string;
  retiradoEm: Date;
  desfeitaEm: Date | null;
  desfeitaPor: string | null;
};

type Banco = {
  categorias: Categoria[];
  salas: Opcao[];
  turmas: Opcao[];
  locais: Local[];
  perfis: PerfilDemo[];
  itens: ItemDb[];
  pedidos: PedidoDb[];
  retiradas: RetiradaDb[];
  diasParaAguardando: number;
};

function criarBanco(): Banco {
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
const global = globalThis as typeof globalThis & { __bancoDemo?: Banco };
function banco(): Banco {
  global.__bancoDemo ??= criarBanco();
  return global.__bancoDemo;
}

// ---------------------------------------------------------------------------
// Montagem dos formatos das telas
// ---------------------------------------------------------------------------

const buscarPor = <T extends { id: string }>(lista: T[], id: string): T => {
  const achado = lista.find((x) => x.id === id);
  if (!achado) throw new Error(`Registro não encontrado: ${id}`);
  return achado;
};

const codigo = (numero: number) => `AP-${numero < 10000 ? String(numero).padStart(4, "0") : numero}`;

function pessoa(id: string): Pessoa {
  const p = buscarPor(banco().perfis, id);
  return { id: p.id, nome: p.nome, rm: p.rm, papel: p.papel };
}

function retiradaValida(itemId: string) {
  return banco().retiradas.find((r) => r.itemId === itemId && !r.desfeitaEm) ?? null;
}

function statusDoItem(item: ItemDb, agora = new Date()): ItemStatus {
  return calcularStatus({
    encontradoEm: item.encontradoEm,
    temRetiradaValida: Boolean(retiradaValida(item.id)),
    diasParaAguardando: banco().diasParaAguardando,
    agora,
  });
}

function situacao(pedido: PedidoDb): SituacaoPedido {
  const retirada = retiradaValida(pedido.itemId);
  if (!retirada) return "pendente";
  return retirada.pedidoId === pedido.id ? "retirado" : "encerrado";
}

function montarPedido(p: PedidoDb): PedidoDoItem {
  const b = banco();
  return {
    id: p.id,
    aluno: pessoa(p.alunoId),
    salaInformada: buscarPor(b.salas, p.salaId),
    turmaInformada: buscarPor(b.turmas, p.turmaId),
    horarioInformado: p.horario,
    criadoEm: p.criadoEm,
    situacao: situacao(p),
  };
}

function montarRetirada(r: RetiradaDb): Retirada {
  return {
    id: r.id,
    pedidoId: r.pedidoId,
    rm: r.rm,
    nome: r.nome,
    registradoPor: pessoa(r.registradoPor),
    retiradoEm: r.retiradoEm,
    desfeitaEm: r.desfeitaEm,
    desfeitaPor: r.desfeitaPor ? pessoa(r.desfeitaPor) : null,
  };
}

function montarItemEquipe(item: ItemDb): ItemEquipe {
  const b = banco();
  const retirada = retiradaValida(item.id);
  return {
    id: item.id,
    codigo: codigo(item.numero),
    categoria: buscarPor(b.categorias, item.categoriaId),
    sala: buscarPor(b.salas, item.salaId),
    turma: item.turmaId ? buscarPor(b.turmas, item.turmaId) : null,
    encontradoEm: item.encontradoEm,
    observacao: item.observacao,
    local: buscarPor(b.locais, item.localId),
    fotoUrl: item.fotoUrl,
    status: statusDoItem(item),
    cadastradoPor: pessoa(item.cadastradoPor),
    pedidosPendentes: retirada
      ? []
      : b.pedidos
          .filter((p) => p.itemId === item.id)
          .sort((a, z) => a.criadoEm.getTime() - z.criadoEm.getTime())
          .map(montarPedido),
    retirada: retirada ? montarRetirada(retirada) : null,
  };
}

function montarItemPublico(item: ItemDb): ItemPublico {
  const b = banco();
  const categoria = buscarPor(b.categorias, item.categoriaId);
  return {
    id: item.id,
    codigo: codigo(item.numero),
    categoria,
    sala: buscarPor(b.salas, item.salaId),
    turma: item.turmaId ? buscarPor(b.turmas, item.turmaId) : null,
    encontradoEm: item.encontradoEm,
    // LGPD: categoria sensível não mostra foto nem observação para alunos
    observacao: categoria.fotoSensivel ? null : item.observacao,
    local: buscarPor(b.locais, item.localId),
    fotoUrl: categoria.fotoSensivel ? null : item.fotoUrl,
    fotoOculta: categoria.fotoSensivel,
  };
}

function textoDeBusca(item: ItemDb) {
  const b = banco();
  const partes = [
    codigo(item.numero),
    buscarPor(b.categorias, item.categoriaId).nome,
    buscarPor(b.salas, item.salaId).nome,
    item.observacao ?? "",
    ...b.pedidos.filter((p) => p.itemId === item.id).flatMap((p) => [pessoa(p.alunoId).nome, pessoa(p.alunoId).rm ?? ""]),
    ...b.retiradas.filter((r) => r.itemId === item.id).flatMap((r) => [r.nome, r.rm]),
  ];
  return normalizar(partes.join(" "));
}

const MS_DIA = 24 * 60 * 60 * 1000;

/** Janela de um relatório e a janela anterior de mesmo tamanho (para comparar). */
export function janela(periodo: PeriodoRelatorio, agora = new Date()) {
  if (periodo === "mes") {
    const inicio = new Date(`${dataIso(agora).slice(0, 7)}-01T03:00:00Z`);
    const inicioAnterior = new Date(inicio);
    inicioAnterior.setUTCMonth(inicioAnterior.getUTCMonth() - 1);
    const fimAnterior = new Date(inicioAnterior.getTime() + (agora.getTime() - inicio.getTime()));
    const mes = formatarMesAno(agora);
    return {
      inicio,
      fim: agora,
      anterior: { inicio: inicioAnterior, fim: fimAnterior },
      rotulo: mes.charAt(0).toUpperCase() + mes.slice(1),
    };
  }
  const dias = periodo === "7d" ? 7 : 30;
  const inicio = new Date(agora.getTime() - dias * MS_DIA);
  return {
    inicio,
    fim: agora,
    anterior: { inicio: new Date(inicio.getTime() - dias * MS_DIA), fim: inicio },
    rotulo: `Últimos ${dias} dias`,
  };
}

const dentro = (data: Date, j: { inicio: Date; fim: Date }) => data >= j.inicio && data <= j.fim;

// ---------------------------------------------------------------------------
// Catálogo e perfis
// ---------------------------------------------------------------------------

export async function catalogo(): Promise<Catalogo> {
  const b = banco();
  return {
    categorias: b.categorias,
    salas: b.salas,
    turmas: b.turmas,
    locais: b.locais,
    diasParaAguardando: b.diasParaAguardando,
  };
}

/** Perfil de teste usado pelo login de demonstração para cada papel. */
export async function perfilDeTeste(papel: Papel, nome: string) {
  const idDeTeste = usuariosTeste.find((u) => u.role === papel)?.id;
  const perfil = banco().perfis.find((p) => p.id === idDeTeste);
  if (!perfil) throw new Error(`Sem perfil de teste para ${papel}`);
  // o nome digitado no login aparece nas telas (ex.: "Registrado por ...")
  if (nome && perfil.nome !== nome) perfil.nome = nome;
  return {
    id: perfil.id,
    email: perfil.email,
    nome: perfil.nome,
    rm: perfil.rm,
    role: perfil.papel,
    local_id: perfil.localId,
    created_at: new Date(0).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------

export async function buscarItensPublicos(filtro: FiltroBuscaAluno): Promise<ItemPublico[]> {
  return banco()
    .itens.filter((item) => !retiradaValida(item.id))
    .filter((item) => !filtro.data || dataIso(item.encontradoEm) === filtro.data)
    .filter((item) => !filtro.periodo || periodoDoDia(item.encontradoEm) === filtro.periodo)
    .filter((item) => !filtro.salaId || item.salaId === filtro.salaId)
    .filter((item) => !filtro.categoriaId || item.categoriaId === filtro.categoriaId)
    .sort((a, z) => z.encontradoEm.getTime() - a.encontradoEm.getTime())
    .map(montarItemPublico);
}

export async function obterItemPublico(id: string): Promise<ItemPublico | null> {
  const item = banco().itens.find((i) => i.id === id);
  if (!item || retiradaValida(item.id)) return null;
  return montarItemPublico(item);
}

export async function pedidoDoAluno(alunoId: string, itemId: string): Promise<string | null> {
  return banco().pedidos.find((p) => p.alunoId === alunoId && p.itemId === itemId)?.id ?? null;
}

export async function criarPedido(alunoId: string, novo: NovoPedido): Promise<{ id: string }> {
  const b = banco();
  const item = b.itens.find((i) => i.id === novo.itemId);
  if (!item || retiradaValida(item.id)) throw new ErroDeNegocio("Este item não está mais disponível.");
  const existente = b.pedidos.find((p) => p.alunoId === alunoId && p.itemId === novo.itemId);
  if (existente) return { id: existente.id };

  buscarPor(b.salas, novo.salaId);
  buscarPor(b.turmas, novo.turmaId);
  const pedido: PedidoDb = {
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
}

function montarMeuPedido(p: PedidoDb): MeuPedido {
  const b = banco();
  return {
    id: p.id,
    item: montarItemPublico(buscarPor(b.itens, p.itemId)),
    salaInformada: buscarPor(b.salas, p.salaId),
    turmaInformada: buscarPor(b.turmas, p.turmaId),
    horarioInformado: p.horario,
    criadoEm: p.criadoEm,
    situacao: situacao(p),
  };
}

export async function listarMeusPedidos(alunoId: string): Promise<MeuPedido[]> {
  return banco()
    .pedidos.filter((p) => p.alunoId === alunoId)
    .sort((a, z) => z.criadoEm.getTime() - a.criadoEm.getTime())
    .map(montarMeuPedido);
}

export async function obterMeuPedido(alunoId: string, pedidoId: string): Promise<MeuPedido | null> {
  const pedido = banco().pedidos.find((p) => p.id === pedidoId && p.alunoId === alunoId);
  return pedido ? montarMeuPedido(pedido) : null;
}

// ---------------------------------------------------------------------------
// Cadastro (monitor e equipe)
// ---------------------------------------------------------------------------

export async function cadastrarItem(autorId: string, novo: NovoItem): Promise<{ id: string; codigo: string }> {
  const b = banco();
  buscarPor(b.categorias, novo.categoriaId);
  buscarPor(b.salas, novo.salaId);
  buscarPor(b.locais, novo.localId);
  if (novo.turmaId) buscarPor(b.turmas, novo.turmaId);

  const agora = new Date();
  if (novo.encontradoEm.getTime() > agora.getTime() + 5 * 60 * 1000) {
    throw new ErroDeNegocio("A data e hora não podem estar no futuro.");
  }

  const numero = Math.max(0, ...b.itens.map((i) => i.numero)) + 1;
  const item: ItemDb = {
    id: crypto.randomUUID(),
    numero,
    fotoUrl: novo.fotoUrl,
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
  return { id: item.id, codigo: codigo(numero) };
}

/** O monitor só vê os itens que ele mesmo cadastrou (igual à policy do banco). */
export async function obterItemCadastrado(autorId: string, id: string): Promise<ItemEquipe | null> {
  const item = banco().itens.find((i) => i.id === id && i.cadastradoPor === autorId);
  return item ? montarItemEquipe(item) : null;
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------

function itensDoLocal(localId: string | null) {
  return banco().itens.filter((i) => !localId || i.localId === localId);
}

export async function listarItensEquipe(filtro: FiltroItensEquipe): Promise<ItemEquipe[]> {
  const busca = filtro.busca ? normalizar(filtro.busca.replace(/^#/, "")) : "";
  const j = filtro.periodo ? janela(filtro.periodo) : null;

  const itens = itensDoLocal(filtro.localId)
    .filter((i) => !filtro.categoriaId || i.categoriaId === filtro.categoriaId)
    .filter((i) => !busca || textoDeBusca(i).includes(busca))
    .map(montarItemEquipe)
    .filter((i) => !filtro.status || i.status === filtro.status)
    .filter((i) => !filtro.soComPedido || i.pedidosPendentes.length > 0)
    .filter((i) => !j || !i.retirada || dentro(i.retirada.retiradoEm, j));

  const comPedidoPrimeiro = (a: ItemEquipe, z: ItemEquipe) =>
    Number(z.pedidosPendentes.length > 0) - Number(a.pedidosPendentes.length > 0);

  if (filtro.status === "retirado") {
    return itens.sort((a, z) => (z.retirada?.retiradoEm.getTime() ?? 0) - (a.retirada?.retiradoEm.getTime() ?? 0));
  }
  if (filtro.status === "aguardando") {
    // com pedido primeiro; depois, do mais antigo para o mais novo
    return itens.sort((a, z) => comPedidoPrimeiro(a, z) || a.encontradoEm.getTime() - z.encontradoEm.getTime());
  }
  return itens.sort((a, z) => comPedidoPrimeiro(a, z) || z.encontradoEm.getTime() - a.encontradoEm.getTime());
}

export async function resumoEquipe(localId: string | null): Promise<ResumoEquipe> {
  const itens = itensDoLocal(localId).map(montarItemEquipe);
  const contar = (status: ItemStatus) => {
    const doStatus = itens.filter((i) => i.status === status);
    return { total: doStatus.length, comPedido: doStatus.filter((i) => i.pedidosPendentes.length > 0).length };
  };
  const mes = janela("mes");

  return {
    recebidos: contar("recebido"),
    aguardando: contar("aguardando"),
    retiradosNoMes: itens.filter((i) => i.retirada && dentro(i.retirada.retiradoEm, mes)).length,
    pedidosPendentes: itens
      .flatMap((item) => item.pedidosPendentes.map((pedido) => ({ pedido, item })))
      .sort((a, z) => z.pedido.criadoEm.getTime() - a.pedido.criadoEm.getTime()),
  };
}

export async function obterItemDetalhe(id: string): Promise<ItemDetalhe | null> {
  const b = banco();
  const item = b.itens.find((i) => i.id === id);
  if (!item) return null;

  const base = montarItemEquipe(item);
  const pedidos = b.pedidos.filter((p) => p.itemId === id).map(montarPedido);
  const retiradas = b.retiradas.filter((r) => r.itemId === id).map(montarRetirada);

  const papelLegivel = (p: Pessoa) => (p.papel === "monitor" ? "monitor" : p.papel === "gestor" ? "coordenação" : "equipe");
  const historico: EventoHistorico[] = [
    {
      tipo: "cadastro" as const,
      quando: item.criadoEm,
      titulo: `Cadastrado por ${base.cadastradoPor.nome} (${papelLegivel(base.cadastradoPor)})`,
    },
    ...pedidos.map((p) => ({ tipo: "pedido" as const, quando: p.criadoEm, titulo: `Pedido de ${p.aluno.nome}` })),
    ...retiradas.flatMap((r) => {
      const eventos: EventoHistorico[] = [
        {
          tipo: "retirada",
          quando: r.retiradoEm,
          titulo: `Retirado por ${r.nome}`,
          detalhe: `registrado por ${r.registradoPor.nome}`,
        },
      ];
      if (r.desfeitaEm) {
        eventos.push({
          tipo: "desfeita",
          quando: r.desfeitaEm,
          titulo: "Retirada desfeita",
          detalhe: r.desfeitaPor ? `por ${r.desfeitaPor.nome}` : undefined,
        });
      }
      return eventos;
    }),
  ].sort((a, z) => a.quando.getTime() - z.quando.getTime());

  return { ...base, pedidos, retiradas, historico };
}

export async function registrarRetirada(equipeId: string, nova: NovaRetirada): Promise<{ id: string }> {
  const b = banco();
  const item = b.itens.find((i) => i.id === nova.itemId);
  if (!item) throw new ErroDeNegocio("Item não encontrado.");
  if (retiradaValida(item.id)) throw new ErroDeNegocio("Este item já foi retirado.");
  if (nova.pedidoId && !b.pedidos.some((p) => p.id === nova.pedidoId && p.itemId === item.id)) {
    throw new ErroDeNegocio("Este pedido não é deste item.");
  }

  const retirada: RetiradaDb = {
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
}

export async function desfazerRetirada(equipeId: string, retiradaId: string): Promise<{ itemId: string }> {
  const retirada = banco().retiradas.find((r) => r.id === retiradaId);
  if (!retirada) throw new ErroDeNegocio("Retirada não encontrada.");
  if (retirada.desfeitaEm) throw new ErroDeNegocio("Esta retirada já foi desfeita.");
  retirada.desfeitaEm = new Date();
  retirada.desfeitaPor = equipeId;
  return { itemId: retirada.itemId };
}

/** Conferência entre cadastro e pedido, já calculada para a tela de retirada. */
export function conferenciaDoPedido(item: ItemEquipe, pedido: PedidoDoItem) {
  return conferir(
    { salaId: item.sala.id, turmaId: item.turma?.id ?? null, encontradoEm: item.encontradoEm },
    { salaId: pedido.salaInformada.id, turmaId: pedido.turmaInformada.id, horario: pedido.horarioInformado },
  );
}

// ---------------------------------------------------------------------------
// Gestor
// ---------------------------------------------------------------------------

export async function dashboard(localId: string | null, periodo: PeriodoRelatorio): Promise<Dashboard> {
  const b = banco();
  const j = janela(periodo);
  const itens = itensDoLocal(localId);
  const noPeriodo = itens.filter((i) => dentro(i.encontradoEm, j));
  const noAnterior = itens.filter((i) => dentro(i.encontradoEm, j.anterior));

  const taxa = (lista: ItemDb[]) => (lista.length ? lista.filter((i) => retiradaValida(i.id)).length / lista.length : 0);
  const tempoMedio = (janelaAlvo: { inicio: Date; fim: Date }) => {
    const tempos = itens
      .map((i) => ({ item: i, retirada: retiradaValida(i.id) }))
      .filter((x) => x.retirada && dentro(x.retirada.retiradoEm, janelaAlvo))
      .map((x) => ((x.retirada as RetiradaDb).retiradoEm.getTime() - x.item.encontradoEm.getTime()) / MS_DIA);
    return tempos.length ? tempos.reduce((s, t) => s + t, 0) / tempos.length : null;
  };

  const contarPor = <K>(lista: ItemDb[], chave: (i: ItemDb) => K) => {
    const mapa = new Map<K, number>();
    for (const i of lista) mapa.set(chave(i), (mapa.get(chave(i)) ?? 0) + 1);
    return mapa;
  };

  const porSala = [...contarPor(noPeriodo, (i) => i.salaId)]
    .map(([salaId, total]) => ({ nome: buscarPor(b.salas, salaId).nome, total }))
    .sort((a, z) => z.total - a.total || a.nome.localeCompare(z.nome));

  const porCategoriaMapa = contarPor(noPeriodo, (i) => i.categoriaId);
  const porCategoria = b.categorias
    .map((categoria) => ({ categoria, total: porCategoriaMapa.get(categoria.id) ?? 0 }))
    .sort((a, z) => z.total - a.total);

  const calor = [1, 2, 3, 4, 5, 6].flatMap((dia) =>
    PERIODOS.map((p) => ({
      dia,
      periodo: p,
      total: noPeriodo.filter((i) => diaDaSemanaLocal(i.encontradoEm) === dia && periodoDoDia(i.encontradoEm) === p).length,
    })),
  );

  let destaque: Dashboard["destaque"] = null;
  const lider = porSala[0];
  if (lider && noPeriodo.length >= 5 && lider.total >= 3) {
    const daSala = noPeriodo.filter((i) => buscarPor(b.salas, i.salaId).nome === lider.nome);
    const porPeriodo = [...contarPor(daSala, (i) => periodoDoDia(i.encontradoEm))].sort((a, z) => z[1] - a[1]);
    destaque = {
      sala: lider.nome,
      percentual: Math.round((lider.total / noPeriodo.length) * 100),
      periodo: porPeriodo[0]?.[0] ?? "noite",
    };
  }

  return {
    periodo: { inicio: j.inicio, fim: j.fim, rotulo: j.rotulo },
    kpis: {
      cadastrados: noPeriodo.length,
      cadastradosAnterior: noAnterior.length,
      taxaDevolucao: taxa(noPeriodo),
      taxaDevolucaoAnterior: taxa(noAnterior),
      tempoMedioRetirada: tempoMedio(j),
      tempoMedioRetiradaAnterior: tempoMedio(j.anterior),
      aguardandoAgora: itens.filter((i) => statusDoItem(i) === "aguardando").length,
    },
    porSala: porSala.slice(0, 6),
    porCategoria,
    calor,
    destaque,
  };
}

export async function historico(filtro: FiltroHistorico): Promise<LinhaHistorico[]> {
  const b = banco();
  const j = janela(filtro.periodo ?? "30d");
  const busca = filtro.busca ? normalizar(filtro.busca.replace(/^#/, "")) : "";

  return b.retiradas
    .filter((r) => dentro(r.retiradoEm, j))
    .map((r) => ({ r, item: buscarPor(b.itens, r.itemId) }))
    .filter(({ item }) => !filtro.localId || item.localId === filtro.localId)
    .filter(({ item }) => !filtro.categoriaId || item.categoriaId === filtro.categoriaId)
    .filter(({ r, item }) => !busca || normalizar(`${r.nome} ${r.rm} ${codigo(item.numero)}`).includes(busca))
    .sort((a, z) => z.r.retiradoEm.getTime() - a.r.retiradoEm.getTime())
    .map(({ r, item }) => ({
      id: r.id,
      itemId: item.id,
      codigo: codigo(item.numero),
      categoria: buscarPor(b.categorias, item.categoriaId),
      nome: r.nome,
      rm: r.rm,
      retiradoEm: r.retiradoEm,
      local: buscarPor(b.locais, item.localId),
      registradoPor: pessoa(r.registradoPor).nome,
      desfeita: Boolean(r.desfeitaEm),
    }));
}

const ORDEM_PAPEL: Record<Papel, number> = { gestor: 0, equipe: 1, monitor: 2, aluno: 3 };

export async function configuracoes(): Promise<Configuracoes> {
  const b = banco();
  return {
    diasParaAguardando: b.diasParaAguardando,
    locais: b.locais,
    categorias: b.categorias,
    pessoas: b.perfis
      .filter((p) => p.papel !== "aluno")
      .sort((a, z) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[z.papel] || a.nome.localeCompare(z.nome))
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        papel: p.papel,
        local: p.localId ? buscarPor(b.locais, p.localId) : null,
      })),
  };
}

export async function atualizarDiasParaAguardando(dias: number) {
  banco().diasParaAguardando = dias;
}

export async function alterarPessoa(id: string, papel: Papel, localId: string | null) {
  const perfil = buscarPor(banco().perfis, id);
  perfil.papel = papel;
  perfil.localId = papel === "equipe" ? localId : null;
}

/** Dá um papel a alguém pelo e-mail. No Supabase, a pessoa precisa ter entrado uma vez (ou ser criada pelo admin). */
export async function definirPapelPorEmail(email: string, papel: Papel, localId: string | null) {
  const b = banco();
  const existente = b.perfis.find((p) => p.email === email);
  if (existente) {
    await alterarPessoa(existente.id, papel, localId);
    return;
  }
  const usuario = email.split("@")[0] ?? email;
  b.perfis.push({
    id: crypto.randomUUID(),
    email,
    nome: usuario.replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    rm: null,
    papel,
    localId: papel === "equipe" ? localId : null,
  });
}
