// Tipos do banco no formato do `supabase gen types typescript`.
// Escritos à mão a partir de supabase/migrations enquanto não há projeto vinculado;
// depois de `supabase link`, regenere com: npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel<FK extends string, Col extends string, Ref extends string> = {
  foreignKeyName: FK;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      locais: {
        Row: { id: string; nome: string; horario_retirada: string; created_at: string };
        Insert: { id?: string; nome: string; horario_retirada?: string; created_at?: string };
        Update: { id?: string; nome?: string; horario_retirada?: string; created_at?: string };
        Relationships: [];
      };
      salas: {
        Row: { id: string; nome: string; created_at: string };
        Insert: { id?: string; nome: string; created_at?: string };
        Update: { id?: string; nome?: string; created_at?: string };
        Relationships: [];
      };
      turmas: {
        Row: { id: string; nome: string; created_at: string };
        Insert: { id?: string; nome: string; created_at?: string };
        Update: { id?: string; nome?: string; created_at?: string };
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          nome: string;
          icone: string;
          cor: string;
          foto_sensivel: boolean;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          icone?: string;
          cor?: string;
          foto_sensivel?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          icone?: string;
          cor?: string;
          foto_sensivel?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          nome: string;
          rm: string | null;
          role: Database["public"]["Enums"]["papel"];
          local_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nome?: string;
          rm?: string | null;
          role?: Database["public"]["Enums"]["papel"];
          local_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome?: string;
          rm?: string | null;
          role?: Database["public"]["Enums"]["papel"];
          local_id?: string | null;
          created_at?: string;
        };
        Relationships: [Rel<"profiles_local_id_fkey", "local_id", "locais">];
      };
      configuracoes: {
        Row: { id: boolean; dias_para_aguardando: number; updated_at: string; updated_by: string | null };
        Insert: { id?: boolean; dias_para_aguardando?: number; updated_at?: string; updated_by?: string | null };
        Update: { id?: boolean; dias_para_aguardando?: number; updated_at?: string; updated_by?: string | null };
        Relationships: [Rel<"configuracoes_updated_by_fkey", "updated_by", "profiles">];
      };
      itens: {
        Row: {
          id: string;
          numero: number;
          codigo: string;
          foto_path: string;
          categoria_id: string;
          sala_id: string;
          turma_id: string | null;
          encontrado_em: string;
          observacao: string | null;
          local_id: string;
          cadastrado_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          foto_path: string;
          categoria_id: string;
          sala_id: string;
          turma_id?: string | null;
          encontrado_em?: string;
          observacao?: string | null;
          local_id: string;
          cadastrado_por?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          foto_path?: string;
          categoria_id?: string;
          sala_id?: string;
          turma_id?: string | null;
          encontrado_em?: string;
          observacao?: string | null;
          local_id?: string;
          cadastrado_por?: string;
          created_at?: string;
        };
        Relationships: [
          Rel<"itens_categoria_id_fkey", "categoria_id", "categorias">,
          Rel<"itens_sala_id_fkey", "sala_id", "salas">,
          Rel<"itens_turma_id_fkey", "turma_id", "turmas">,
          Rel<"itens_local_id_fkey", "local_id", "locais">,
          Rel<"itens_cadastrado_por_fkey", "cadastrado_por", "profiles">,
        ];
      };
      pedidos: {
        Row: {
          id: string;
          item_id: string;
          aluno_id: string;
          sala_informada_id: string;
          turma_informada_id: string;
          horario_informado: string;
          confirmou_carteirinha: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          aluno_id?: string;
          sala_informada_id: string;
          turma_informada_id: string;
          horario_informado: string;
          confirmou_carteirinha: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          aluno_id?: string;
          sala_informada_id?: string;
          turma_informada_id?: string;
          horario_informado?: string;
          confirmou_carteirinha?: boolean;
          created_at?: string;
        };
        Relationships: [
          Rel<"pedidos_item_id_fkey", "item_id", "itens">,
          Rel<"pedidos_aluno_id_fkey", "aluno_id", "profiles">,
          Rel<"pedidos_sala_informada_id_fkey", "sala_informada_id", "salas">,
          Rel<"pedidos_turma_informada_id_fkey", "turma_informada_id", "turmas">,
        ];
      };
      retiradas: {
        Row: {
          id: string;
          item_id: string;
          pedido_id: string | null;
          rm: string;
          nome: string;
          carteirinha_conferida: boolean;
          registrado_por: string;
          retirado_em: string;
          desfeita_em: string | null;
          desfeita_por: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          pedido_id?: string | null;
          rm: string;
          nome: string;
          carteirinha_conferida: boolean;
          registrado_por?: string;
          retirado_em?: string;
          desfeita_em?: string | null;
          desfeita_por?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          pedido_id?: string | null;
          rm?: string;
          nome?: string;
          carteirinha_conferida?: boolean;
          registrado_por?: string;
          retirado_em?: string;
          desfeita_em?: string | null;
          desfeita_por?: string | null;
        };
        Relationships: [
          Rel<"retiradas_item_id_fkey", "item_id", "itens">,
          Rel<"retiradas_registrado_por_fkey", "registrado_por", "profiles">,
          Rel<"retiradas_desfeita_por_fkey", "desfeita_por", "profiles">,
        ];
      };
    };
    Views: {
      itens_com_status: {
        Row: {
          id: string;
          numero: number;
          codigo: string;
          foto_path: string;
          categoria_id: string;
          sala_id: string;
          turma_id: string | null;
          encontrado_em: string;
          observacao: string | null;
          local_id: string;
          cadastrado_por: string;
          created_at: string;
          status: Database["public"]["Enums"]["item_status"];
          retirada_id: string | null;
          total_pedidos: number;
        };
        Relationships: [
          Rel<"itens_categoria_id_fkey", "categoria_id", "categorias">,
          Rel<"itens_sala_id_fkey", "sala_id", "salas">,
          Rel<"itens_turma_id_fkey", "turma_id", "turmas">,
          Rel<"itens_local_id_fkey", "local_id", "locais">,
          Rel<"itens_cadastrado_por_fkey", "cadastrado_por", "profiles">,
        ];
      };
      itens_busca: {
        Row: {
          id: string;
          codigo: string;
          categoria_id: string;
          sala_id: string;
          turma_id: string | null;
          encontrado_em: string;
          local_id: string;
          foto_path: string | null;
          observacao: string | null;
          foto_oculta: boolean;
        };
        Relationships: [
          Rel<"itens_categoria_id_fkey", "categoria_id", "categorias">,
          Rel<"itens_sala_id_fkey", "sala_id", "salas">,
          Rel<"itens_turma_id_fkey", "turma_id", "turmas">,
          Rel<"itens_local_id_fkey", "local_id", "locais">,
        ];
      };
      meus_pedidos: {
        Row: {
          id: string;
          item_id: string;
          sala_informada_id: string;
          turma_informada_id: string;
          horario_informado: string;
          created_at: string;
          codigo: string;
          categoria_id: string;
          sala_id: string;
          local_id: string;
          encontrado_em: string;
          foto_path: string | null;
          foto_oculta: boolean;
          status: Database["public"]["Enums"]["pedido_status"];
        };
        Relationships: [
          Rel<"itens_categoria_id_fkey", "categoria_id", "categorias">,
          Rel<"itens_sala_id_fkey", "sala_id", "salas">,
          Rel<"itens_local_id_fkey", "local_id", "locais">,
        ];
      };
    };
    Functions: Record<never, never>;
    Enums: {
      papel: "aluno" | "monitor" | "equipe" | "gestor";
      item_status: "recebido" | "aguardando" | "retirado";
      pedido_status: "pendente" | "retirado" | "encerrado";
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Papel = Enums<"papel">;
