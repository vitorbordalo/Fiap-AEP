import { describe, expect, it } from "vitest";
import { emailPermitido, esquemaEmail } from "./email";

describe("emailPermitido", () => {
  const dominios = ["fiap.com.br"];

  it("aceita o domínio exato, sem diferenciar maiúsculas", () => {
    expect(emailPermitido("rm550001@fiap.com.br", dominios)).toBe(true);
    expect(emailPermitido("Ana.Souza@FIAP.com.br", dominios)).toBe(true);
  });

  it("recusa outros domínios, subdomínios e parecidos", () => {
    expect(emailPermitido("alguem@gmail.com", dominios)).toBe(false);
    expect(emailPermitido("alguem@fiap.com.br.evil.com", dominios)).toBe(false);
    expect(emailPermitido("alguem@outro.fiap.com.br", dominios)).toBe(false);
    expect(emailPermitido("sem-arroba", dominios)).toBe(false);
  });

  it("aceita uma lista com vários domínios", () => {
    expect(emailPermitido("x@fiap.edu.br", ["fiap.com.br", "fiap.edu.br"])).toBe(true);
  });
});

describe("esquemaEmail", () => {
  it("normaliza espaços e maiúsculas", () => {
    expect(esquemaEmail.parse("  RM550001@FIAP.com.br ")).toBe("rm550001@fiap.com.br");
  });

  it("recusa texto que não é e-mail", () => {
    expect(esquemaEmail.safeParse("rm550001").success).toBe(false);
  });
});
