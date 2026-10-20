import "server-only";
import { MODO_DEMO } from "@/lib/modo";
import * as demo from "./demo";

/**
 * Ponto único de acesso a dados para as telas. Hoje só existe a implementação em memória
 * (modo demonstração); a versão Supabase entra aqui com as mesmas funções, sem mudar as telas.
 */
export function dados() {
  if (!MODO_DEMO) {
    throw new Error("As telas ainda leem só os dados de demonstração. Remova o .env.local para usar o modo demonstração.");
  }
  return demo;
}

export * from "./tipos";
