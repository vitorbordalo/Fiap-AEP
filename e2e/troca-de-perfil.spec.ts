import { expect, test } from "@playwright/test";
import { entrar, MODO_SUPABASE } from "./entrar";

/** Demonstração: dá para alternar entre os quatro perfis sem voltar ao login (botão no canto e menu do avatar). */
test.skip(MODO_SUPABASE, "a troca de perfil só existe no modo demonstração");

test("o botão de demonstração alterna entre os quatro perfis", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Monitor", "Apresentação");
  // o botão flutuante aparece em telas largas (notebook); no celular, as opções ficam no menu do avatar
  await pagina.setViewportSize({ width: 1366, height: 768 });
  const destinos = [
    ["Aluno", /\/aluno$/],
    ["Equipe", /\/equipe$/],
    ["Gestor", /\/gestor$/],
    ["Monitor", /\/monitor$/],
  ] as const;
  for (const [perfil, url] of destinos) {
    await pagina.getByRole("button", { name: /Você está como|Trocar perfil/ }).click();
    await pagina.locator("#troca-de-perfil").getByRole("button", { name: new RegExp(perfil) }).click();
    await expect(pagina).toHaveURL(url);
  }
});

test("no celular, o menu do avatar também troca de perfil e sai para o login", async ({ browser }) => {
  const { pagina } = await entrar(browser, "Aluno", "Apresentação");
  await pagina.getByRole("button", { name: /Menu de/ }).click();
  await pagina.getByRole("menuitem", { name: "Equipe" }).click();
  await expect(pagina).toHaveURL(/\/equipe$/);

  // ao trocar, entra a persona da equipe (scripts/seed/usuarios-teste.json)
  await pagina.getByRole("button", { name: /Ana Souza/ }).click();
  await pagina.getByRole("menuitem", { name: "Sair" }).click();
  await expect(pagina).toHaveURL(/\/login$/);
});
