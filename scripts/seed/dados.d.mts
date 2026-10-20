import type { Papel } from "../../src/lib/supabase/database.types";

type Id = { id: string };

export type DadosDemo = {
  locais: (Id & { nome: string; horario_retirada: string })[];
  salas: (Id & { nome: string })[];
  turmas: (Id & { nome: string })[];
  categorias: (Id & { nome: string; icone: string; cor: string; foto_sensivel: boolean; ordem: number })[];
  usuarios: (Id & { email: string; nome: string; rm: string | null; role: Papel; local_id: string | null })[];
  itens: (Id & {
    foto_path: string;
    categoria_id: string;
    sala_id: string;
    turma_id: string | null;
    encontrado_em: Date;
    observacao: string | null;
    local_id: string;
    cadastrado_por: string;
    created_at: Date;
  })[];
  pedidos: (Id & {
    item_id: string;
    aluno_id: string;
    sala_informada_id: string;
    turma_informada_id: string;
    horario_informado: string;
    confirmou_carteirinha: boolean;
    created_at: Date;
  })[];
  retiradas: (Id & {
    item_id: string;
    pedido_id: string | null;
    rm: string;
    nome: string;
    carteirinha_conferida: boolean;
    registrado_por: string;
    retirado_em: Date;
    desfeita_em: Date | null;
    desfeita_por: string | null;
  })[];
  resumo: { recebidos: number; aguardando: number; retirados: number };
};

export function gerarDadosDemo(opcoes?: { agora?: Date }): DadosDemo;
