import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decidirRota } from "@/lib/auth/rotas";
import { COOKIE_SESSAO_DEMO, lerSessaoDemo } from "@/lib/auth/sessao-demo";
import { envPublico } from "@/lib/env";
import { CONFIGURACAO_AUSENTE, MODO_DEMO } from "@/lib/modo";
import type { Database, Papel } from "@/lib/supabase/database.types";

/**
 * Roda antes de cada página: renova a sessão do Supabase (cookies) e manda cada perfil para a sua área.
 * É uma checagem otimista de navegação. A autorização de verdade está no RLS e nos layouts de cada área.
 */
export async function proxy(request: NextRequest) {
  if (CONFIGURACAO_AUSENTE) {
    return new NextResponse(
      "Achados e Perdidos: o Supabase não está configurado. Defina NEXT_PUBLIC_SUPABASE_URL, " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY (veja docs/supabase.md), " +
        "ou NEXT_PUBLIC_MODO_DEMO=1 para publicar a demonstração com dados fictícios.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  if (MODO_DEMO) {
    const sessao = lerSessaoDemo(request.cookies.get(COOKIE_SESSAO_DEMO)?.value);
    return aplicarDecisao(request, NextResponse.next({ request }), sessao?.papel ?? null, Boolean(sessao));
  }

  let response = NextResponse.next({ request });
  const env = envPublico();

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [chave, valor] of Object.entries(headers)) response.headers.set(chave, valor);
      },
    },
  });

  // getClaims valida o JWT; não troque por getSession, que confia no cookie sem validar.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  let papel: Papel | null = null;
  if (userId) {
    const { data: perfil } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    papel = perfil?.role ?? null;
  }

  return aplicarDecisao(request, response, papel, Boolean(userId));
}

function aplicarDecisao(request: NextRequest, response: NextResponse, papel: Papel | null, logado: boolean) {
  const decisao = decidirRota({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    logado,
    papel,
  });

  if (decisao.tipo === "seguir") return response;

  const redirecionamento = NextResponse.redirect(new URL(decisao.para, request.url));
  // mantém os cookies de sessão renovados
  for (const cookie of response.cookies.getAll()) redirecionamento.cookies.set(cookie);
  return redirecionamento;
}

export const config = {
  matcher: [
    // tudo, menos arquivos estáticos e imagens
    "/((?!_next/static|_next/image|favicon.ico|seed/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
