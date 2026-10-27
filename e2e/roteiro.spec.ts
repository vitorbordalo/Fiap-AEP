import { expect, test, type Page } from "@playwright/test";
import { MODO_SUPABASE } from "./entrar";

/**
 * Segue, passo a passo, docs/roteiro-da-apresentacao.md, num notebook (1366x768).
 * Se este teste quebrar, o roteiro precisa ser revisto antes de apresentar.
 */
test.skip(MODO_SUPABASE, "o roteiro usa o modo demonstração");
test.use({ viewport: { width: 1366, height: 768 } });

async function trocarPara(pagina: Page, perfil: string, url: RegExp) {
  await pagina.getByRole("button", { name: /Você está como|Trocar perfil/ }).click();
  await pagina.locator("#troca-de-perfil").getByRole("button", { name: new RegExp(perfil) }).click();
  await expect(pagina).toHaveURL(url);
}

test("roteiro da apresentação, do monitor ao gestor", async ({ page: p }) => {
  // 2. Monitor
  await p.goto("/login");
  await p.getByRole("button", { name: "Monitor", exact: true }).click();
  await p.getByRole("button", { name: "Entrar" }).click();
  await expect(p).toHaveURL(/\/monitor$/);
  await p.getByRole("button", { name: "Usar foto de exemplo" }).first().click();
  await expect(p).toHaveURL(/\/monitor\/novo$/);
  await p.getByRole("radio", { name: "Garrafa" }).click();
  await p.getByLabel("Sala", { exact: true }).selectOption({ label: "Sala 304" });
  await p.getByLabel("Turma (opcional)").selectOption({ label: "2ESPH" });
  await p.getByRole("button", { name: "Cadastrar item" }).click();
  await expect(p.getByRole("status")).toHaveText("Item cadastrado!");
  const protocolo = (await p.getByText(/#AP-\d{4}/).first().textContent())?.match(/#AP-\d{4}/)?.[0] as string;

  // 3. Aluno
  await trocarPara(p, "Aluno", /\/aluno$/);
  await expect(p.getByText("Olá, Mariana")).toBeVisible();
  await p.getByRole("radio", { name: "Garrafa" }).click();
  await p.getByRole("button", { name: "Buscar itens" }).click();
  await p.locator("a[href^='/aluno/itens/']").first().click();
  await expect(p.getByText(`Item ${protocolo}`)).toBeVisible();
  await p.getByRole("link", { name: /É meu/ }).click();
  await p.getByLabel("Sala onde você estava").selectOption({ label: "Sala 304" });
  await p.getByLabel("Sua turma").selectOption({ label: "2ESPH" });
  await p.getByLabel("Horário aproximado").fill(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date()),
  );
  await p.getByText("Confirmo que este item é meu").click();
  await p.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(p.getByRole("heading", { name: "Pedido enviado!" })).toBeVisible();
  // Documento com a data padrão (hoje): aparece, sem foto
  await p.goto("/aluno");
  await p.getByRole("radio", { name: "Documento" }).click();
  await p.getByRole("button", { name: "Buscar itens" }).click();
  await expect(p.getByRole("img", { name: "Foto oculta: documento" }).first()).toBeVisible();

  // 4. Equipe
  await trocarPara(p, "Equipe", /\/equipe$/);
  await expect(p.getByLabel("Local exibido")).toHaveValue("todos");
  const pedido = p.getByRole("listitem").filter({ hasText: protocolo });
  await expect(pedido).toContainText("Mariana Costa");
  await pedido.getByRole("link", { name: "Registrar retirada" }).click();
  const modal = p.getByRole("dialog", { name: "Registrar retirada" });
  await expect(modal.getByText("Os dados conferem.")).toBeVisible();
  await expect(modal.getByRole("button", { name: "Confirmar retirada" })).toBeDisabled();
  await modal.getByText("Conferi a carteirinha do aluno").click();
  await modal.getByRole("button", { name: "Confirmar retirada" }).click();
  await expect(p.getByRole("button", { name: "Desfazer" })).toBeVisible();
  await p.goto("/equipe/retirados");
  await p.getByRole("article").filter({ hasText: protocolo }).getByRole("link", { name: "Ver detalhes" }).click();
  await expect(p.getByText("Retirado por Mariana Costa").first()).toBeVisible();
  await expect(p.getByText("Registrado por").first()).toBeVisible();
  await p.getByRole("button", { name: "Desfazer retirada" }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Desfazer retirada" }).click();
  await expect(p.getByText("O item voltou para a lista").first()).toBeVisible();

  // 5. Gestor
  await trocarPara(p, "Gestor", /\/gestor$/);
  await expect(p.getByText("Taxa de devolução")).toBeVisible();
  await expect(p.getByText("Quando os itens são perdidos")).toBeVisible();
  await p.getByRole("link", { name: "Histórico" }).click();
  await expect(p.getByRole("link", { name: "Exportar CSV" })).toBeVisible();
  await p.getByRole("link", { name: "Configurações" }).click();
  await p.locator("#dias").fill("5");
  await p.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(p.getByText(/mais de 5 dias aparecem em Aguardando/)).toBeVisible();
  // volta ao padrão para não afetar outros testes
  await p.locator("#dias").fill("7");
  await p.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(p.getByText(/mais de 7 dias aparecem em Aguardando/)).toBeVisible();
});
