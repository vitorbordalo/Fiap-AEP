/**
 * Formatos de dados que as telas consomem. São independentes da origem (memória no modo
 * demonstração, Supabase depois), então as telas não mudam quando o banco for ligado.
 */

import type { PeriodoDoDia } from "@/lib/dominio/periodo";
import type { ItemStatus } from "@/lib/dominio/status";
import type { Papel } from "@/lib/supabase/database.types";

export type Categoria = { id: string; nome: string; icone: string; cor: string; fotoSensivel: boolean };
export type Opcao = { id: string; nome: string };
export type Local = { id: string; nome: string; horarioRetirada: string };

export type Catalogo = {
  categorias: Categoria[];
  salas: Opcao[];
  turmas: Opcao[];
  locais: Local[];
  diasParaAguardando: number;
};

export type Pessoa = { id: string; nome: string; rm: string | null; papel: Papel };

export type SituacaoPedido = "pendente" | "retirado" | "encerrado";

export type PedidoDoItem = {
  id: string;
  aluno: Pessoa;
  salaInformada: Opcao;
  turmaInformada: Opcao;
  /** "22:00" */
  horarioInformado: string;
  criadoEm: Date;
  situacao: SituacaoPedido;
};

export type Retirada = {
  id: string;
  pedidoId: string | null;
  rm: string;
  nome: string;
  registradoPor: Pessoa;
  retiradoEm: Date;
  desfeitaEm: Date | null;
  desfeitaPor: Pessoa | null;
};

/** Item como a equipe e o gestor veem. */
export type ItemEquipe = {
  id: string;
  codigo: string;
  categoria: Categoria;
  sala: Opcao;
  turma: Opcao | null;
  encontradoEm: Date;
  observacao: string | null;
  local: Local;
  fotoUrl: string;
  status: ItemStatus;
  cadastradoPor: Pessoa;
  /** Pedidos ainda sem retirada (vazio se o item foi retirado). */
  pedidosPendentes: PedidoDoItem[];
  /** Retirada válida, se houver. */
  retirada: Retirada | null;
};

export type EventoHistorico = {
  tipo: "cadastro" | "pedido" | "retirada" | "desfeita";
  quando: Date;
  titulo: string;
  detalhe?: string;
};

export type ItemDetalhe = ItemEquipe & {
  pedidos: PedidoDoItem[];
  retiradas: Retirada[];
  historico: EventoHistorico[];
};

/** Item como o aluno vê: sem autoria, sem pedidos de outros e sem foto de categoria sensível. */
export type ItemPublico = {
  id: string;
  codigo: string;
  categoria: Categoria;
  sala: Opcao;
  turma: Opcao | null;
  encontradoEm: Date;
  observacao: string | null;
  local: Local;
  fotoUrl: string | null;
  fotoOculta: boolean;
};

export type MeuPedido = {
  id: string;
  item: ItemPublico;
  salaInformada: Opcao;
  turmaInformada: Opcao;
  horarioInformado: string;
  criadoEm: Date;
  situacao: SituacaoPedido;
};

export type FiltroBuscaAluno = {
  /** "2026-10-19" */
  data?: string;
  periodo?: PeriodoDoDia;
  salaId?: string;
  categoriaId?: string;
};

export type PeriodoRelatorio = "7d" | "30d" | "mes";

export type FiltroItensEquipe = {
  localId: string | null;
  status?: ItemStatus;
  busca?: string;
  categoriaId?: string;
  soComPedido?: boolean;
  /** Só para retirados: janela da data de retirada. */
  periodo?: PeriodoRelatorio;
};

export type ResumoEquipe = {
  recebidos: { total: number; comPedido: number };
  aguardando: { total: number; comPedido: number };
  retiradosNoMes: number;
  pedidosPendentes: { pedido: PedidoDoItem; item: ItemEquipe }[];
};

export type Dashboard = {
  periodo: { inicio: Date; fim: Date; rotulo: string };
  kpis: {
    cadastrados: number;
    cadastradosAnterior: number;
    /** 0 a 1: itens do período que já foram retirados. */
    taxaDevolucao: number;
    taxaDevolucaoAnterior: number;
    /** Em dias; null se ainda não houve retirada. */
    tempoMedioRetirada: number | null;
    tempoMedioRetiradaAnterior: number | null;
    aguardandoAgora: number;
  };
  porSala: { nome: string; total: number }[];
  porCategoria: { categoria: Categoria; total: number }[];
  /** dia 1 = segunda ... 6 = sábado */
  calor: { dia: number; periodo: PeriodoDoDia; total: number }[];
  destaque: { sala: string; percentual: number; periodo: PeriodoDoDia } | null;
};

export type LinhaHistorico = {
  id: string;
  itemId: string;
  codigo: string;
  categoria: Categoria;
  nome: string;
  rm: string;
  retiradoEm: Date;
  local: Local;
  registradoPor: string;
  desfeita: boolean;
};

export type FiltroHistorico = {
  busca?: string;
  localId?: string | null;
  categoriaId?: string;
  periodo?: PeriodoRelatorio;
};

export type PessoaEquipe = { id: string; nome: string; email: string; papel: Papel; local: Local | null };

export type Configuracoes = {
  diasParaAguardando: number;
  locais: Local[];
  pessoas: PessoaEquipe[];
  categorias: Categoria[];
};

export type NovoItem = {
  fotoUrl: string;
  categoriaId: string;
  salaId: string;
  turmaId: string | null;
  encontradoEm: Date;
  observacao: string | null;
  localId: string;
};

export type NovoPedido = {
  itemId: string;
  salaId: string;
  turmaId: string;
  horario: string;
};

export type NovaRetirada = {
  itemId: string;
  pedidoId: string | null;
  rm: string;
  nome: string;
};

/** Erro de regra de negócio, com mensagem pronta para mostrar ao usuário. */
export class ErroDeNegocio extends Error {
  override name = "ErroDeNegocio";
}
