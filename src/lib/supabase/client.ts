import { createBrowserClient } from "@supabase/ssr";
import { envPublico } from "@/lib/env";
import type { Database } from "./database.types";

/** Cliente Supabase para Client Components (ex.: upload da foto direto para o Storage). */
export function createClient() {
  const env = envPublico();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
