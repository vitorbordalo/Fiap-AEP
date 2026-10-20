import { describe, expect, it } from "vitest";
import { caminhoSeguro, decidirRota, destinoAposLogin } from "./rotas";

const semLogin = { logado: false, papel: null, search: "" } as const;

describe("decidirRota sem login", () => {
  it("manda as áreas protegidas para o login, guardando o destino", () => {
    expect(decidirRota({ ...semLogin, pathname: "/aluno/pedidos" })).toEqual({
      tipo: "redirecionar",
      para: "/login?next=%2Faluno%2Fpedidos",
    });
    expect(decidirRota({ ...semLogin, pathname: "/equipe/recebidos", search: "?local=ti" })).toEqual({
      tipo: "redirecionar",
      para: "/login?next=%2Fequipe%2Frecebidos%3Flocal%3Dti",
    });
  });

  it("a área do monitor usa o login do monitor", () => {
    expect(decidirRota({ ...semLogin, pathname: "/monitor/novo" })).toEqual({
      tipo: "redirecionar",
      para: "/monitor/login?next=%2Fmonitor%2Fnovo",
    });
  });

  it("deixa abertas as páginas de login, o callback e o /dev", () => {
    for (const pathname of ["/login", "/monitor/login", "/auth/confirmar", "/dev/entrar"]) {
      expect(decidirRota({ ...semLogin, pathname })).toEqual({ tipo: "seguir" });
    }
  });

  it("a raiz vai para o login do aluno", () => {
    expect(decidirRota({ ...semLogin, pathname: "/" })).toEqual({ tipo: "redirecionar", para: "/login" });
  });
});

describe("decidirRota com login", () => {
  it("cada perfil acessa a própria área", () => {
    expect(decidirRota({ pathname: "/equipe/itens/1", search: "", logado: true, papel: "equipe" })).toEqual({
      tipo: "seguir",
    });
  });

  it("bloqueia a área de outro perfil, mandando para a própria", () => {
    expect(decidirRota({ pathname: "/gestor", search: "", logado: true, papel: "aluno" })).toEqual({
      tipo: "redirecionar",
      para: "/aluno",
    });
    expect(decidirRota({ pathname: "/equipe", search: "", logado: true, papel: "monitor" })).toEqual({
      tipo: "redirecionar",
      para: "/monitor",
    });
  });

  it("a raiz e as páginas de login levam para a área do perfil", () => {
    expect(decidirRota({ pathname: "/", search: "", logado: true, papel: "gestor" })).toEqual({
      tipo: "redirecionar",
      para: "/gestor",
    });
    expect(decidirRota({ pathname: "/login", search: "", logado: true, papel: "monitor" })).toEqual({
      tipo: "redirecionar",
      para: "/monitor",
    });
  });

  it("logado sem perfil volta para o login com aviso, sem entrar em loop", () => {
    expect(decidirRota({ pathname: "/aluno", search: "", logado: true, papel: null })).toEqual({
      tipo: "redirecionar",
      para: "/login?next=%2Faluno&erro=perfil",
    });
    expect(decidirRota({ pathname: "/login", search: "", logado: true, papel: null })).toEqual({ tipo: "seguir" });
  });
});

describe("destinoAposLogin", () => {
  it("respeita o ?next= só se for da área do perfil", () => {
    expect(destinoAposLogin("aluno", "?next=%2Faluno%2Fpedidos")).toBe("/aluno/pedidos");
    expect(destinoAposLogin("aluno", "?next=%2Fgestor")).toBe("/aluno");
    expect(destinoAposLogin("equipe", "")).toBe("/equipe");
  });
});

describe("caminhoSeguro", () => {
  it("recusa URLs externas", () => {
    expect(caminhoSeguro("https://malicioso.com")).toBeNull();
    expect(caminhoSeguro("//malicioso.com")).toBeNull();
    expect(caminhoSeguro("/\\malicioso.com")).toBeNull();
    expect(caminhoSeguro("/aluno")).toBe("/aluno");
  });

  it("recusa caracteres que o parser de URL ignora (TAB, quebra de linha)", () => {
    expect(caminhoSeguro("/\t/malicioso.com")).toBeNull();
    expect(caminhoSeguro("/\n/malicioso.com")).toBeNull();
    expect(caminhoSeguro("/%09/malicioso.com")).toBe("/%09/malicioso.com");
    expect(caminhoSeguro("/aluno/pedidos?novo=1")).toBe("/aluno/pedidos?novo=1");
  });
});
