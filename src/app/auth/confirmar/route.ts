import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { caminhoSeguro, LOGIN_ALUNO } from "@/lib/auth/rotas";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino do link mágico. Aceita os dois formatos do Supabase:
 * - token_hash + type (template de e-mail recomendado; funciona mesmo abrindo o link em outro navegador)
 * - code (fluxo PKCE padrão; exige abrir o link no mesmo navegador que pediu)
 * Depois de entrar, vai para o ?next= (ou para a raiz, e o proxy leva à área do perfil).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = caminhoSeguro(searchParams.get("next")) ?? "/";

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const destino = ok ? next : `${LOGIN_ALUNO}?erro=link`;
  return NextResponse.redirect(new URL(destino, request.url));
}
