/**
 * Montagem dos formatos das telas a partir de linhas "cruas" do banco.
 * É pura (sem I/O): o modo demonstração e o Supabase carregam um Retrato com os dados
 * necessários e usam as mesmas funções, então as duas versões nunca divergem nas regras.
 */

import { periodoDoDia, PERIODOS } from "@/lib/dominio/periodo";
import { calcularStatus, type ItemStatus } from "@/lib/dominio/status";
import { dataIso, diaDaSemanaLocal, formatarMesAno, normalizar } from "@/lib/formato";
import type { Papel } from "@/lib/supabase/database.types";
import type {
  Catalogo,
  Categoria,
  Configuracoes,
  Dashboard,
  EventoHistorico,
  FiltroHistorico,
  FiltroItensEquipe,
  ItemDetalhe,
  ItemEquipe,
  ItemPublico,
  LinhaHistorico,
  Local,
  Opcao,
  PedidoDoItem,
  PeriodoRelatorio,
  Pessoa,
  ResumoEquipe,
  Retirada,
  SituacaoPedido,
} from "./tipos";

export type PerfilLinha = { id: string; email: string; nome: string; rm: string | null; papel: Papel; localId: string | null };
export type ItemLinha = {
  id: string;
  numero: number;
  /** URL pronta para exibir (seed, data URL ou URL assinada do Storage). */
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
export type PedidoLinha = {
  id: string;
  itemId: string;
  alunoId: string;
  salaId: string;
  turmaId: string;
  horario: string;
  criadoEm: Date;
};
export type RetiradaLinha = {
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

/** Recorte dos dados com tudo o que as funções de montagem precisam. */
export type Retrato = {
  categorias: Categoria[];
  salas: Opcao[];
  turmas: Opcao[];
  locais: Local[];
  perfis: PerfilLinha[];
  itens: ItemLinha[];
  pedidos: PedidoLinha[];
  retiradas: RetiradaLinha[];
  diasParaAguardando: number;
};

const MS_DIA = 24 * 60 * 60 * 1000;

export const codigoDoNumero = (numero: number) => `AP-${numero < 10000 ? String(numero).padStart(4, "0") : numero}`;

function buscarPor<T extends { id: string }>(lista: T[], id: string, oQue: string): T {
  const achado = lista.find((x) => x.id === id);
  if (!achado) throw new Error(`${oQue} não encontrado(a): ${id}`);
  return achado;
}

/** Pessoa que não está no recorte (ex.: perfil apagado): aparece sem quebrar a tela. */
function pessoa(r: Retrato, id: string): Pessoa {
  const p = r.perfis.find((x) => x.id === id);
  return p ? { id: p.id, nome: p.nome || p.email, rm: p.rm, papel: p.papel } : { id, nome: "Pessoa removida", rm: null, papel: "aluno" };
}

export function retiradaValida(r: Retrato, itemId: string) {
  return r.retiradas.find((x) => x.itemId === itemId && !x.desfeitaEm) ?? null;
}

export function statusDoItem(r: Retrato, item: ItemLinha, agora = new Date()): ItemStatus {
  return calcularStatus({
    encontradoEm: item.encontradoEm,
    temRetiradaValida: Boolean(retiradaValida(r, item.id)),
    diasParaAguardando: r.diasParaAguardando,
    agora,
  });
}

function situacao(r: Retrato, pedido: PedidoLinha): SituacaoPedido {
  const retirada = retiradaValida(r, pedido.itemId);
  if (!retirada) return "pendente";
  return retirada.pedidoId === pedido.id ? "retirado" : "encerrado";
}

export function montarPedido(r: Retrato, p: PedidoLinha): PedidoDoItem {
  return {
    id: p.id,
    aluno: pessoa(r, p.alunoId),
    salaInformada: buscarPor(r.salas, p.salaId, "Sala"),
    turmaInformada: buscarPor(r.turmas, p.turmaId, "Turma"),
    horarioInformado: p.horario,
    criadoEm: p.criadoEm,
    situacao: situacao(r, p),
  };
}

export function montarRetirada(r: Retrato, x: RetiradaLinha): Retirada {
  return {
    id: x.id,
    pedidoId: x.pedidoId,
    rm: x.rm,
    nome: x.nome,
    registradoPor: pessoa(r, x.registradoPor),
    retiradoEm: x.retiradoEm,
    desfeitaEm: x.desfeitaEm,
    desfeitaPor: x.desfeitaPor ? pessoa(r, x.desfeitaPor) : null,
  };
}

export function montarItemEquipe(r: Retrato, item: ItemLinha): ItemEquipe {
  const retirada = retiradaValida(r, item.id);
  return {
    id: item.id,
    codigo: codigoDoNumero(item.numero),
    categoria: buscarPor(r.categorias, item.categoriaId, "Categoria"),
    sala: buscarPor(r.salas, item.salaId, "Sala"),
    turma: item.turmaId ? buscarPor(r.turmas, item.turmaId, "Turma") : null,
    encontradoEm: item.encontradoEm,
    observacao: item.observacao,
    local: buscarPor(r.locais, item.localId, "Local"),
    fotoUrl: item.fotoUrl,
    status: statusDoItem(r, item),
    cadastradoPor: pessoa(r, item.cadastradoPor),
    pedidosPendentes: retirada
      ? []
      : r.pedidos
          .filter((p) => p.itemId === item.id)
          .sort((a, z) => a.criadoEm.getTime() - z.criadoEm.getTime())
          .map((p) => montarPedido(r, p)),
    retirada: retirada ? montarRetirada(r, retirada) : null,
  };
}

/** Versão do aluno: categoria sensível sem foto e sem observação (LGPD). */
export function montarItemPublico(
  catalogo: Pick<Retrato, "categorias" | "salas" | "turmas" | "locais">,
  item: Omit<ItemLinha, "cadastradoPor" | "criadoEm" | "fotoUrl"> & { fotoUrl: string | null },
): ItemPublico {
  const categoria = buscarPor(catalogo.categorias, item.categoriaId, "Categoria");
  return {
    id: item.id,
    codigo: codigoDoNumero(item.numero),
    categoria,
    sala: buscarPor(catalogo.salas, item.salaId, "Sala"),
    turma: item.turmaId ? buscarPor(catalogo.turmas, item.turmaId, "Turma") : null,
    encontradoEm: item.encontradoEm,
    observacao: categoria.fotoSensivel ? null : item.observacao,
    local: buscarPor(catalogo.locais, item.localId, "Local"),
    fotoUrl: categoria.fotoSensivel ? null : item.fotoUrl,
    fotoOculta: categoria.fotoSensivel,
  };
}

export function montarDetalhe(r: Retrato, item: ItemLinha): ItemDetalhe {
  const base = montarItemEquipe(r, item);
  const pedidos = r.pedidos.filter((p) => p.itemId === item.id).map((p) => montarPedido(r, p));
  const retiradas = r.retiradas.filter((x) => x.itemId === item.id).map((x) => montarRetirada(r, x));

  const papelLegivel = (p: Pessoa) => (p.papel === "monitor" ? "monitor" : p.papel === "gestor" ? "coordenação" : "equipe");
  const historico: EventoHistorico[] = [
    {
      tipo: "cadastro" as const,
      quando: item.criadoEm,
      titulo: `Cadastrado por ${base.cadastradoPor.nome} (${papelLegivel(base.cadastradoPor)})`,
    },
    ...pedidos.map((p) => ({ tipo: "pedido" as const, quando: p.criadoEm, titulo: `Pedido de ${p.aluno.nome}` })),
    ...retiradas.flatMap((x) => {
      const eventos: EventoHistorico[] = [
        { tipo: "retirada", quando: x.retiradoEm, titulo: `Retirado por ${x.nome}`, detalhe: `registrado por ${x.registradoPor.nome}` },
      ];
      if (x.desfeitaEm) {
        eventos.push({
          tipo: "desfeita",
          quando: x.desfeitaEm,
          titulo: "Retirada desfeita",
          detalhe: x.desfeitaPor ? `por ${x.desfeitaPor.nome}` : undefined,
        });
      }
      return eventos;
    }),
  ].sort((a, z) => a.quando.getTime() - z.quando.getTime());

  return { ...base, pedidos, retiradas, historico };
}

// ---------------------------------------------------------------------------
// Listas, resumo, relatórios
// ---------------------------------------------------------------------------

/** Janela de um relatório e a janela anterior de mesmo tamanho (para comparar). */
export function janela(periodo: PeriodoRelatorio, agora = new Date()) {
  if (periodo === "mes") {
    // meia-noite do dia 1 em São Paulo (UTC-3)
    const inicio = new Date(`${dataIso(agora).slice(0, 7)}-01T03:00:00Z`);
    const inicioAnterior = new Date(inicio);
    inicioAnterior.setUTCMonth(inicioAnterior.getUTCMonth() - 1);
    // mesmo número de dias do mês atual, sem passar do fim do mês anterior (ex.: 31/03 x fevereiro)
    const fimAnterior = new Date(Math.min(inicioAnterior.getTime() + (agora.getTime() - inicio.getTime()), inicio.getTime()));
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

function textoDeBusca(r: Retrato, item: ItemLinha) {
  const partes = [
    codigoDoNumero(item.numero),
    buscarPor(r.categorias, item.categoriaId, "Categoria").nome,
    buscarPor(r.salas, item.salaId, "Sala").nome,
    item.observacao ?? "",
    ...r.pedidos.filter((p) => p.itemId === item.id).flatMap((p) => [pessoa(r, p.alunoId).nome, pessoa(r, p.alunoId).rm ?? ""]),
    ...r.retiradas.filter((x) => x.itemId === item.id).flatMap((x) => [x.nome, x.rm]),
  ];
  return normalizar(partes.join(" "));
}

export function filtrarItensEquipe(r: Retrato, filtro: FiltroItensEquipe, agora = new Date()): ItemEquipe[] {
  const busca = filtro.busca ? normalizar(filtro.busca.replace(/^#/, "")) : "";
  const j = filtro.periodo ? janela(filtro.periodo, agora) : null;

  const itens = r.itens
    .filter((i) => !filtro.localId || i.localId === filtro.localId)
    .filter((i) => !filtro.categoriaId || i.categoriaId === filtro.categoriaId)
    .filter((i) => !busca || textoDeBusca(r, i).includes(busca))
    .map((i) => montarItemEquipe(r, i))
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
  return itens.sort(
    (a, z) => comPedidoPrimeiro(a, z) || z.encontradoEm.getTime() - a.encontradoEm.getTime() || z.codigo.localeCompare(a.codigo),
  );
}

export function resumirEquipe(r: Retrato, localId: string | null, agora = new Date()): ResumoEquipe {
  const itens = r.itens.filter((i) => !localId || i.localId === localId).map((i) => montarItemEquipe(r, i));
  const contar = (status: ItemStatus) => {
    const doStatus = itens.filter((i) => i.status === status);
    return { total: doStatus.length, comPedido: doStatus.filter((i) => i.pedidosPendentes.length > 0).length };
  };
  const mes = janela("mes", agora);

  return {
    recebidos: contar("recebido"),
    aguardando: contar("aguardando"),
    retiradosNoMes: itens.filter((i) => i.retirada && dentro(i.retirada.retiradoEm, mes)).length,
    pedidosPendentes: itens
      .flatMap((item) => item.pedidosPendentes.map((pedido) => ({ pedido, item })))
      .sort((a, z) => z.pedido.criadoEm.getTime() - a.pedido.criadoEm.getTime()),
  };
}

export function calcularDashboard(r: Retrato, localId: string | null, periodo: PeriodoRelatorio, agora = new Date()): Dashboard {
  const j = janela(periodo, agora);
  const itens = r.itens.filter((i) => !localId || i.localId === localId);
  const noPeriodo = itens.filter((i) => dentro(i.encontradoEm, j));
  const noAnterior = itens.filter((i) => dentro(i.encontradoEm, j.anterior));

  const taxa = (lista: ItemLinha[]) => (lista.length ? lista.filter((i) => retiradaValida(r, i.id)).length / lista.length : 0);
  const tempoMedio = (alvo: { inicio: Date; fim: Date }) => {
    const tempos = itens
      .map((i) => ({ item: i, retirada: retiradaValida(r, i.id) }))
      .filter((x): x is { item: ItemLinha; retirada: RetiradaLinha } => Boolean(x.retirada && dentro(x.retirada.retiradoEm, alvo)))
      .map((x) => (x.retirada.retiradoEm.getTime() - x.item.encontradoEm.getTime()) / MS_DIA);
    return tempos.length ? tempos.reduce((s, t) => s + t, 0) / tempos.length : null;
  };

  const contarPor = <K>(lista: ItemLinha[], chave: (i: ItemLinha) => K) => {
    const mapa = new Map<K, number>();
    for (const i of lista) mapa.set(chave(i), (mapa.get(chave(i)) ?? 0) + 1);
    return mapa;
  };

  const porSala = [...contarPor(noPeriodo, (i) => i.salaId)]
    .map(([salaId, total]) => ({ nome: buscarPor(r.salas, salaId, "Sala").nome, total }))
    .sort((a, z) => z.total - a.total || a.nome.localeCompare(z.nome));

  const porCategoriaMapa = contarPor(noPeriodo, (i) => i.categoriaId);
  const porCategoria = r.categorias
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
    const daSala = noPeriodo.filter((i) => buscarPor(r.salas, i.salaId, "Sala").nome === lider.nome);
    const porPeriodo = [...contarPor(daSala, (i) => periodoDoDia(i.encontradoEm))].sort((a, z) => z[1] - a[1]);
    destaque = { sala: lider.nome, percentual: Math.round((lider.total / noPeriodo.length) * 100), periodo: porPeriodo[0]?.[0] ?? "noite" };
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
      aguardandoAgora: itens.filter((i) => statusDoItem(r, i, agora) === "aguardando").length,
    },
    porSala: porSala.slice(0, 6),
    porCategoria,
    calor,
    destaque,
  };
}

export function filtrarHistorico(r: Retrato, filtro: FiltroHistorico, agora = new Date()): LinhaHistorico[] {
  const j = janela(filtro.periodo ?? "30d", agora);
  const busca = filtro.busca ? normalizar(filtro.busca.replace(/^#/, "")) : "";

  return r.retiradas
    .filter((x) => dentro(x.retiradoEm, j))
    .flatMap((x) => {
      const item = r.itens.find((i) => i.id === x.itemId);
      return item ? [{ x, item }] : [];
    })
    .filter(({ item }) => !filtro.localId || item.localId === filtro.localId)
    .filter(({ item }) => !filtro.categoriaId || item.categoriaId === filtro.categoriaId)
    .filter(({ x, item }) => !busca || normalizar(`${x.nome} ${x.rm} ${codigoDoNumero(item.numero)}`).includes(busca))
    .sort((a, z) => z.x.retiradoEm.getTime() - a.x.retiradoEm.getTime())
    .map(({ x, item }) => ({
      id: x.id,
      itemId: item.id,
      codigo: codigoDoNumero(item.numero),
      categoria: buscarPor(r.categorias, item.categoriaId, "Categoria"),
      nome: x.nome,
      rm: x.rm,
      retiradoEm: x.retiradoEm,
      local: buscarPor(r.locais, item.localId, "Local"),
      registradoPor: pessoa(r, x.registradoPor).nome,
      desfeita: Boolean(x.desfeitaEm),
    }));
}

const ORDEM_PAPEL: Record<Papel, number> = { gestor: 0, equipe: 1, monitor: 2, aluno: 3 };

export function montarConfiguracoes(r: Pick<Retrato, "categorias" | "locais" | "perfis" | "diasParaAguardando">): Configuracoes {
  return {
    diasParaAguardando: r.diasParaAguardando,
    locais: r.locais,
    categorias: r.categorias,
    pessoas: r.perfis
      .filter((p) => p.papel !== "aluno")
      .sort((a, z) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[z.papel] || a.nome.localeCompare(z.nome))
      .map((p) => ({
        id: p.id,
        nome: p.nome || p.email,
        email: p.email,
        papel: p.papel,
        local: p.localId ? (r.locais.find((l) => l.id === p.localId) ?? null) : null,
      })),
  };
}

export function catalogoDe(r: Pick<Retrato, "categorias" | "salas" | "turmas" | "locais" | "diasParaAguardando">): Catalogo {
  return {
    categorias: r.categorias,
    salas: r.salas,
    turmas: r.turmas,
    locais: r.locais,
    diasParaAguardando: r.diasParaAguardando,
  };
}
