import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { entrar, type Perfil } from "./entrar";

/**
 * Acessibilidade automática (axe-core, WCAG 2.1 A e AA) em todas as telas.
 * Não substitui teste com leitor de tela, mas pega contraste, labels, nomes de botões e estrutura.
 */

async function analisar(pagina: Page, url: string) {
  await pagina.goto(url);
  await pagina.waitForLoadState("networkidle");
  const resultado = await new AxeBuilder({ page: pagina }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return resultado.violations.map((v) => ({
    regra: v.id,
    impacto: v.impact,
    descricao: v.help,
    exemplos: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
}

const TELAS: Record<Perfil, string[]> = {
  Aluno: ["/aluno", "/aluno/resultados", "/aluno/pedidos"],
  Monitor: ["/monitor"],
  Equipe: ["/equipe", "/equipe/recebidos", "/equipe/aguardando", "/equipe/retirados", "/equipe/itens/novo"],
  Gestor: ["/gestor", "/gestor/historico", "/gestor/configuracoes"],
};

for (const [perfil, urls] of Object.entries(TELAS) as [Perfil, string[]][]) {
  test(`${perfil}: sem violações WCAG A/AA`, async ({ browser }) => {
    const { pagina } = await entrar(browser, perfil, `${perfil} A11y`);
    const problemas: Record<string, unknown> = {};
    for (const url of urls) {
      const violacoes = await analisar(pagina, url);
      if (violacoes.length) problemas[url] = violacoes;
    }
    expect(problemas).toEqual({});
  });
}

test("telas de login sem violações WCAG A/AA", async ({ page }) => {
  const problemas: Record<string, unknown> = {};
  for (const url of ["/login", "/monitor/login"]) {
    const violacoes = await analisar(page, url);
    if (violacoes.length) problemas[url] = violacoes;
  }
  expect(problemas).toEqual({});
});
