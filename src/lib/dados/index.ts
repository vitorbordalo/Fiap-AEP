import "server-only";
import { MODO_DEMO } from "@/lib/modo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { repositorioDemo } from "./demo";
import { criarRepositorioSupabase } from "./supabase";
import type { Repositorio } from "./tipos";

const repositorioSupabase = criarRepositorioSupabase({
  cliente: createClient,
  admin: process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient : undefined,
});

/**
 * Ponto único de acesso a dados para telas e Server Actions.
 * Sem Supabase configurado, usa o modo demonstração (memória); com ele, o banco real (sob RLS).
 */
export function dados(): Repositorio {
  return MODO_DEMO ? repositorioDemo : repositorioSupabase;
}

export * from "./tipos";
