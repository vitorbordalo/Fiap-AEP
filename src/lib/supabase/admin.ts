import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envPublico } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente com a service role: ignora o RLS. Use só no servidor e só quando não há outro jeito
 * (criar usuário antes do link mágico, /dev/entrar). Nunca para ler ou gravar dados de negócio.
 */
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY no .env.local");

  return createClient<Database>(envPublico().NEXT_PUBLIC_SUPABASE_URL, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
