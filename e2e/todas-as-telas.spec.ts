import { expect, test, type Page } from "@playwright/test";
import { entrar } from "./entrar";

/**
 * Fumaça: abre cada tela de cada perfil e falha se alguma cair na tela de erro,
 * responder 404/500 ou registrar erro no console. Roda nos dois modos (demonstração e Supabase).
 */

async function visitar(pagina: Page, url: string, titulo: RegExp | string) {
  const erros: string[] = [];
  const aoErrar = (e: Error) => erros.push(e.message);
  const aoLogar = (m: { type: () => string; text: () => string }) => m.type() === "error" && erros.push(m.text());
  pagina.on("pageerror", aoErrar);
  pagina.on("console", aoLogar);

  const resposta = await pagina.goto(url);
  expect(resposta?.status(), url).toBeLessThan(400);
  await expect(pagina.getByRole("heading", { name: titulo }).first(), url).toBeVisible();
  await expect(pagina.getByText("Algo deu errado"), url).toHaveCount(0);

  pagina.off("pageerror", aoErrar);
  pagina.off("console", aoLogar);
  expect(erros, `erros no console em ${url}`).toEqual([]);
}

test("aluno: todas as telas abrem", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Aluno", "Aluno Fumaça");
  await visitar(pagina, "/aluno", "Buscar");
  await visitar(pagina, "/aluno/resultados", "Resultados");
  await visitar(pagina, "/aluno/pedidos", "Meus pedidos");

  await pagina.goto("/aluno/resultados");
  const item = await pagina.locator("a[href^='/aluno/itens/']").first().getAttribute("href");
  await visitar(pagina, item as string, "Detalhes do item");

  await pagina.goto("/aluno/pedidos");
  const pedido = await pagina.locator("a[href^='/aluno/pedidos/']").first().getAttribute("href");
  await visitar(pagina, pedido as string, /Seu pedido|Pedido enviado/);
});

test("monitor: câmera e detalhes abrem", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Monitor", "Monitor Fumaça");
  await visitar(pagina, "/monitor", "Novo item");
  // sem foto, o M3 pede para voltar à câmera em vez de quebrar
  await pagina.goto("/monitor/novo");
  await expect(pagina.getByText("Comece pela foto do item.")).toBeVisible();
});

test("equipe: início, listas, detalhe, retirada e novo item abrem", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Equipe", "Equipe Fumaça");
  await visitar(pagina, "/equipe", "Itens");
  await visitar(pagina, "/equipe/recebidos", "Recebidos");
  await visitar(pagina, "/equipe/aguardando", "Aguardando retirada");
  await visitar(pagina, "/equipe/retirados", "Retirados");
  await visitar(pagina, "/equipe/retirados?periodo=30d&busca=AP", "Retirados");

  await pagina.goto("/equipe/recebidos");
  const detalhe = await pagina.locator("article a[href^='/equipe/itens/']").first().getAttribute("href");
  await visitar(pagina, detalhe as string, /.+/);
  // E5 e E6 abertos por link direto (versão página inteira)
  await visitar(pagina, `${detalhe}/retirada`, "Registrar retirada");
  await visitar(pagina, "/equipe/itens/novo", "Novo item");
});

test("gestor: dashboard nos três períodos, histórico, CSV e configurações abrem", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Gestor", "Gestor Fumaça");
  await visitar(pagina, "/gestor", "Dashboard");
  await visitar(pagina, "/gestor?periodo=7d", "Dashboard");
  await visitar(pagina, "/gestor?periodo=mes", "Dashboard");
  await visitar(pagina, "/gestor/historico", "Histórico de retiradas");
  await visitar(pagina, "/gestor/configuracoes", "Configurações");

  const csv = await pagina.request.get("/gestor/historico/csv?periodo=30d");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect((await csv.text()).split("\r\n").length).toBeGreaterThan(2);
});

test("404 tem a cara do app", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Aluno", "Aluno 404");
  // id que não existe e id malformado: 404 com a cara do app, nunca a tela de erro
  for (const url of ["/aluno/itens/00000000-0000-4000-8000-000000000000", "/aluno/itens/abc", "/aluno/pedidos/abc"]) {
    // com loading.tsx a resposta já começou em streaming: o Next mantém 200 e marca noindex
    await pagina.goto(url);
    await expect(pagina.getByText("Não encontramos esta página.", { exact: false }), url).toBeVisible();
    await expect(pagina.getByText("Algo deu errado"), url).toHaveCount(0);
  }
});
