import { z } from "zod";

/**
 * Variáveis de ambiente públicas (vão para o navegador). As secretas ficam em src/lib/supabase/admin.ts.
 * As referências precisam ser literais (process.env.NOME) para o Next embutir os valores no bundle do cliente.
 */
const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: "Defina NEXT_PUBLIC_SUPABASE_URL no .env.local" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, { error: "Defina NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local" }),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export function envPublico() {
  return esquemaPublico.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
}

/** Domínios de e-mail aceitos no login (ALLOWED_EMAIL_DOMAINS, separados por vírgula). */
export function dominiosPermitidos(): string[] {
  const valor = process.env.ALLOWED_EMAIL_DOMAINS || "fiap.com.br";
  return valor
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}
