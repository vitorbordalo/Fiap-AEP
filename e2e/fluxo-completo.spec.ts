import { expect, test } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { entrar } from "./entrar";

/**
 * Caminho principal do produto, do jeito que acontece no campus:
 * monitor cadastra → aluno encontra e pede → equipe confere e registra a retirada → aluno vê "Retirado".
 * Cada perfil usa o próprio aparelho (celular para monitor e aluno, desktop para a equipe).
 */

/** PNG sólido de 4x4 gerado na hora (a foto do item no teste). */
function pngDeTeste() {
  const crc = (buf: Buffer) => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const bloco = (tipo: string, dados: Buffer) => {
    const corpo = Buffer.concat([Buffer.from(tipo), dados]);
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(dados.length);
    const verificacao = Buffer.alloc(4);
    verificacao.writeUInt32BE(crc(corpo));
    return Buffer.concat([tamanho, corpo, verificacao]);
  };
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(4, 0);
  cabecalho.writeUInt32BE(4, 4);
  cabecalho[8] = 8; // 8 bits
  cabecalho[9] = 2; // RGB
  const linha = Buffer.from([0, ...Array.from({ length: 4 }, () => [0x33, 0x66, 0x99]).flat()]);
  const imagem = deflateSync(Buffer.concat([linha, linha, linha, linha]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", cabecalho),
    bloco("IDAT", imagem),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

test("do cadastro pelo monitor até a retirada pela equipe", async ({ browser }) => {
  const observacao = `Guarda-chuva E2E ${Date.now()}`;

  // 1. Monitor fotografa e cadastra, em poucos toques
  const { pagina: monitor } = await entrar(browser, "Monitor", "Monitora E2E");
  await monitor.locator("input[type=file]:not([capture])").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: pngDeTeste() });
  await monitor.waitForURL(/\/monitor\/novo$/);
  await monitor.getByRole("radio", { name: "Guarda-chuva" }).click();
  await monitor.getByLabel("Sala", { exact: true }).selectOption({ label: "Sala 304" });
  await monitor.getByLabel("Observação (opcional)").fill(observacao);
  await monitor.getByRole("button", { name: "Cadastrar item" }).click();
  await monitor.waitForURL(/\/monitor\/novo\/sucesso/);
  await expect(monitor.getByRole("status")).toHaveText("Item cadastrado!");
  const protocolo = (await monitor.getByText(/#AP-\d{4}/).first().textContent())?.match(/#AP-\d{4}/)?.[0];
  expect(protocolo).toBeTruthy();

  // 2. Aluno encontra o item e diz "É meu"
  const { pagina: aluno, nome: nomeAluno } = await entrar(browser, "Aluno", "Aluna E2E");
  await aluno.getByRole("radio", { name: "Guarda-chuva" }).click();
  await aluno.getByRole("button", { name: "Buscar itens" }).click();
  await aluno.waitForURL(/\/aluno\/resultados/);
  await aluno.getByRole("link", { name: /Guarda-chuva.*Sala 304/ }).first().click();
  await expect(aluno.getByText(observacao)).toBeVisible();
  await aluno.getByRole("link", { name: /É meu/ }).click();
  await aluno.getByLabel("Sala onde você estava").selectOption({ label: "Sala 304" });
  await aluno.getByLabel("Sua turma").selectOption({ label: "2ESPH" });
  await aluno.getByLabel("Horário aproximado").fill(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date()));
  await aluno.getByText("Confirmo que este item é meu").click();
  await aluno.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(aluno.getByRole("heading", { name: "Pedido enviado!" })).toBeVisible();

  // 3. Equipe vê o pedido, confere e registra a retirada
  const { pagina: equipe } = await entrar(browser, "Equipe", "Equipe E2E");
  // a equipe começa em "Todos os locais": o item guardado em qualquer local aparece sem trocar nada
  await expect(equipe.getByLabel("Local exibido")).toHaveValue("todos");
  await equipe.waitForLoadState("networkidle");
  const linhaDoPedido = equipe.getByRole("listitem").filter({ hasText: protocolo as string });
  await expect(linhaDoPedido).toContainText(nomeAluno);
  await linhaDoPedido.getByRole("link", { name: "Registrar retirada" }).click();

  const modal = equipe.getByRole("dialog", { name: "Registrar retirada" });
  await expect(modal.getByRole("radio", { name: `Pedido de ${nomeAluno}` })).toHaveAttribute("aria-checked", "true");
  await expect(modal.getByText("Os dados conferem.")).toBeVisible();
  const confirmar = modal.getByRole("button", { name: "Confirmar retirada" });
  await expect(confirmar).toBeDisabled();
  await modal.getByText("Conferi a carteirinha do aluno").click();
  await confirmar.click();
  await expect(equipe.getByText(`Retirada registrada: Guarda-chuva ${protocolo}.`)).toBeVisible();

  // 4. Aluno vê o pedido como retirado; o item some da busca
  await aluno.goto("/aluno/pedidos");
  const meuPedido = aluno.getByRole("listitem").filter({ hasText: "Guarda-chuva" }).filter({ hasText: "Retirado" });
  await expect(meuPedido.first()).toBeVisible();

  // 5. No detalhe (E7), a equipe vê o histórico completo e pode desfazer
  await equipe.goto("/equipe/retirados");
  await equipe.getByRole("article").filter({ hasText: protocolo as string }).getByRole("link", { name: "Ver detalhes" }).click();
  await expect(equipe.getByText(`Retirado por ${nomeAluno}`).first()).toBeVisible();
  await expect(equipe.getByText(`Pedido de ${nomeAluno}`).first()).toBeVisible();
  await expect(equipe.getByText("Carteirinha conferida")).toBeVisible();
});

test("item cadastrado pelo monitor aparece para a equipe em qualquer local de guarda", async ({ browser }) => {
  const { pagina: monitor } = await entrar(browser, "Monitor", "Monitor Locais");
  const { pagina: equipe } = await entrar(browser, "Equipe", "Equipe Locais");

  for (const local of ["Achados e Perdidos", "Sala de TI"]) {
    const observacao = `Garrafa ${local} ${Date.now()}`;
    await monitor.goto("/monitor");
    await monitor.locator("input[type=file]:not([capture])").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: pngDeTeste() });
    await monitor.waitForURL(/\/monitor\/novo$/);
    await monitor.getByRole("radio", { name: "Garrafa" }).click();
    await monitor.getByLabel("Sala", { exact: true }).selectOption({ label: "Sala 304" });
    await monitor.locator("label").filter({ hasText: local }).click();
    await monitor.getByLabel("Observação (opcional)").fill(observacao);
    await monitor.getByRole("button", { name: "Cadastrar item" }).click();
    await monitor.waitForURL(/\/monitor\/novo\/sucesso/);
    const protocolo = (await monitor.getByText(/#AP-\d{4}/).first().textContent())?.match(/#AP-\d{4}/)?.[0] as string;

    await equipe.goto("/equipe/recebidos");
    await expect(equipe.getByRole("article").filter({ hasText: protocolo })).toBeVisible();
  }
});

test("documento nunca mostra foto para o aluno", async ({ browser }) => {
  const { pagina: aluno } = await entrar(browser, "Aluno", "Aluno LGPD");
  await aluno.getByRole("radio", { name: "Documento" }).click();
  await aluno.getByLabel("Data").fill("");
  await aluno.getByRole("button", { name: "Buscar itens" }).click();
  await aluno.waitForURL(/\/aluno\/resultados/);
  const ocultas = aluno.getByRole("img", { name: "Foto oculta: documento" });
  await expect(ocultas.first()).toBeVisible();
  expect(await aluno.locator("img[alt='Foto do item: Documento']").count()).toBe(0);
});

test("cada perfil só entra na própria área", async ({ browser }) => {
  const { pagina: aluno } = await entrar(browser, "Aluno", "Aluno Curioso");
  for (const area of ["/equipe", "/gestor", "/monitor"]) {
    await aluno.goto(area);
    await expect(aluno).toHaveURL(/\/aluno$/);
  }
  const semLogin = await (await browser.newContext()).newPage();
  await semLogin.goto("/equipe/recebidos");
  await expect(semLogin).toHaveURL(/\/login\?next=%2Fequipe%2Frecebidos/);
});
