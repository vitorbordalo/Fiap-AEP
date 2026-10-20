import { describe, expect, it } from "vitest";
import { calcularStatus } from "./status";

const agora = new Date("2026-10-20T22:00:00-03:00");
const diasAtras = (dias: number) => new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);

describe("calcularStatus", () => {
  it("retirado sempre vence, não importa o tempo no local", () => {
    expect(calcularStatus({ encontradoEm: diasAtras(30), temRetiradaValida: true, diasParaAguardando: 7, agora })).toBe(
      "retirado",
    );
  });

  it("recebido até N dias no local, inclusive no limite exato", () => {
    expect(calcularStatus({ encontradoEm: diasAtras(0), temRetiradaValida: false, diasParaAguardando: 7, agora })).toBe(
      "recebido",
    );
    expect(calcularStatus({ encontradoEm: diasAtras(7), temRetiradaValida: false, diasParaAguardando: 7, agora })).toBe(
      "recebido",
    );
  });

  it("aguardando com mais de N dias no local", () => {
    expect(calcularStatus({ encontradoEm: diasAtras(7.01), temRetiradaValida: false, diasParaAguardando: 7, agora })).toBe(
      "aguardando",
    );
  });

  it("respeita o N configurado", () => {
    expect(calcularStatus({ encontradoEm: diasAtras(4), temRetiradaValida: false, diasParaAguardando: 3, agora })).toBe(
      "aguardando",
    );
  });
});
