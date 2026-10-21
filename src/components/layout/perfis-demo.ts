import { Archive, Camera, ClipboardList, LayoutDashboard, type LucideIcon } from "lucide-react";
import type { Papel } from "@/lib/supabase/database.types";

/** Os quatro perfis na ordem em que a história do produto acontece. */
export const PERFIS_DEMO: { papel: Papel; rotulo: string; descricao: string; icone: LucideIcon }[] = [
  { papel: "monitor", rotulo: "Monitor", descricao: "Cadastra itens pelo celular", icone: Camera },
  { papel: "aluno", rotulo: "Aluno", descricao: "Busca e pede o item", icone: Archive },
  { papel: "equipe", rotulo: "Equipe", descricao: "Registra quem retirou", icone: ClipboardList },
  { papel: "gestor", rotulo: "Gestor", descricao: "Acompanha os números", icone: LayoutDashboard },
];
