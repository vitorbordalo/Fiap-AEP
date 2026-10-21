import type { Browser, Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import usuariosTeste from "../scripts/seed/usuarios-teste.json";

/** Login dos testes E2E nos dois modos: formulário de demonstração ou cookie de sessão do Supabase. */

export const CELULAR = { width: 390, height: 844 };
export const DESKTOP = { width: 1440, height: 900 };

export const MODO_SUPABASE = process.env.E2E_MODO === "supabase";
export type Perfil = "Aluno" | "Monitor" | "Equipe" | "Gestor";
const AREA: Record<Perfil, string> = { Aluno: "/aluno", Monitor: "/monitor", Equipe: "/equipe", Gestor: "/gestor" };

/**
 * No modo Supabase não há e-mail para clicar: a sessão entra direto no cookie, no mesmo formato
 * do @supabase/ssr, com um JWT assinado como o Supabase Auth faria (scripts/e2e-supabase.mjs).
 */
function cookieDeSessao(perfil: Perfil) {
  const usuario = usuariosTeste.find((u) => u.role === perfil.toLowerCase());
  if (!usuario) throw new Error(`sem usuário de teste para ${perfil}`);
  const segredo = process.env.E2E_JWT_SECRET as string;
  const expira = Math.floor(Date.now() / 1000) + 3600;
  const b64 = (dados: string) => Buffer.from(dados).toString("base64url");
  const cabecalho = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = b64(JSON.stringify({ sub: usuario.id, email: usuario.email, role: "authenticated", aud: "authenticated", exp: expira }));
  const assinatura = createHmac("sha256", segredo).update(`${cabecalho}.${corpo}`).digest("base64url");
  const sessao = {
    access_token: `${cabecalho}.${corpo}.${assinatura}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expira,
    refresh_token: "e2e",
    user: { id: usuario.id, aud: "authenticated", role: "authenticated", email: usuario.email, app_metadata: {}, user_metadata: {} },
  };
  const host = new URL(process.env.E2E_SUPABASE_URL as string).hostname.split(".")[0];
  return { name: `sb-${host}-auth-token`, value: `base64-${b64(JSON.stringify(sessao))}`, nome: usuario.nome };
}

/**
 * Entra com o perfil e devolve a página e o nome que aparece nas telas para esse perfil.
 * Por padrão, equipe e gestor no desktop e aluno e monitor no celular.
 */
export async function entrar(
  browser: Browser,
  perfil: Perfil,
  nomeDemo: string,
  viewport = perfil === "Equipe" || perfil === "Gestor" ? DESKTOP : CELULAR,
): Promise<{ pagina: Page; nome: string }> {
  const contexto = await browser.newContext({ viewport });
  const pagina = await contexto.newPage();

  if (MODO_SUPABASE) {
    const cookie = cookieDeSessao(perfil);
    await contexto.addCookies([{ name: cookie.name, value: cookie.value, domain: "localhost", path: "/", sameSite: "Lax" }]);
    await pagina.goto(AREA[perfil]);
    await pagina.waitForURL(new RegExp(`${AREA[perfil]}$`));
    return { pagina, nome: cookie.nome };
  }

  await pagina.goto(perfil === "Aluno" ? "/login" : "/monitor/login");
  await pagina.getByLabel("Usuário").fill(nomeDemo);
  await pagina.getByLabel("Senha").fill("qualquer-senha");
  await pagina.getByRole("button", { name: perfil, exact: true }).click();
  await pagina.getByRole("button", { name: "Entrar" }).click();
  await pagina.waitForURL(new RegExp(`${AREA[perfil]}$`));
  return { pagina, nome: nomeDemo };
}
