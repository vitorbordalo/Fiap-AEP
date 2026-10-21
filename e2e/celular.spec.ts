import { expect, test, type Page } from "@playwright/test";
import { CELULAR, entrar } from "./entrar";

/**
 * Todas as áreas no celular (390px), inclusive equipe e gestor, que nasceram para o desktop:
 * nenhuma tela pode rolar para o lado nem cortar conteúdo.
 */

async function semRolagemLateral(pagina: Page, url?: string) {
  if (url) await pagina.goto(url);
  await pagina.waitForLoadState("networkidle");
  const { largura, tela } = await pagina.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    tela: document.documentElement.clientWidth,
  }));
  expect(largura, `rolagem lateral em ${pagina.url()}`).toBeLessThanOrEqual(tela);
}

test("equipe no celular: início, listas, detalhe, retirada e novo item cabem na tela", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Equipe", "Equipe Celular", CELULAR);
  await semRolagemLateral(pagina);
  for (const lista of ["/equipe/recebidos", "/equipe/aguardando", "/equipe/retirados"]) await semRolagemLateral(pagina, lista);

  await pagina.goto("/equipe/aguardando");
  const detalhe = (await pagina.locator("article a[href^='/equipe/itens/']").first().getAttribute("href")) as string;
  await semRolagemLateral(pagina, detalhe);
  await semRolagemLateral(pagina, `${detalhe}/retirada`);
  await semRolagemLateral(pagina, "/equipe/itens/novo");

  // o modal da retirada aberto pela lista também cabe, com os botões visíveis
  await pagina.goto("/equipe");
  await pagina.getByRole("link", { name: "Registrar retirada" }).first().click();
  const modal = pagina.getByRole("dialog", { name: "Registrar retirada" });
  await expect(modal.getByRole("button", { name: "Confirmar retirada" })).toBeInViewport();
  await semRolagemLateral(pagina);
});

test("gestor no celular: dashboard, histórico e configurações cabem na tela", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Gestor", "Gestor Celular", CELULAR);
  await semRolagemLateral(pagina);
  await expect(pagina.getByRole("img", { name: /Itens por sala/ })).toBeVisible();
  await semRolagemLateral(pagina, "/gestor/historico");
  // no celular, o histórico é uma lista de cartões no lugar da tabela
  await expect(pagina.getByRole("table")).toBeHidden();
  await semRolagemLateral(pagina, "/gestor/configuracoes");
});

test("aluno e monitor no celular cabem na tela", async ({ browser }) => {
  const { pagina: aluno } = await entrar(browser, "Aluno", "Aluno Celular");
  await semRolagemLateral(aluno);
  await semRolagemLateral(aluno, "/aluno/resultados");
  await semRolagemLateral(aluno, "/aluno/pedidos");

  const { pagina: monitor } = await entrar(browser, "Monitor", "Monitor Celular");
  await semRolagemLateral(monitor);
});
