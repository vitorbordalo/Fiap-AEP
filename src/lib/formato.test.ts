import { describe, expect, it } from "vitest";
import {
  dataHoraIso,
  diasDesde,
  formatarDataHora,
  formatarRelativo,
  formatarTempoNoLocal,
  iniciais,
  lerDataHoraLocal,
  normalizar,
} from "./formato";

const agora = new Date("2026-10-20T22:00:00-03:00");

describe("formato", () => {
  it("formata no fuso de São Paulo, mesmo com a data em UTC no dia seguinte", () => {
    // 01:30 UTC do dia 20 = 22:30 do dia 19 em São Paulo
    expect(formatarDataHora(new Date("2026-10-20T01:30:00Z"))).toBe("19/10/2026 · 22:30");
  });

  it("lê e escreve o valor do datetime-local em horário de São Paulo", () => {
    const data = lerDataHoraLocal("2026-10-19T22:10");
    expect(data?.toISOString()).toBe("2026-10-20T01:10:00.000Z");
    expect(dataHoraIso(data as Date)).toBe("2026-10-19T22:10");
    expect(lerDataHoraLocal("ontem")).toBeNull();
  });

  it("conta dias pelo calendário local", () => {
    expect(diasDesde(new Date("2026-10-20T08:00:00-03:00"), agora)).toBe(0);
    expect(diasDesde(new Date("2026-10-19T23:59:00-03:00"), agora)).toBe(1);
    expect(formatarTempoNoLocal(new Date("2026-10-14T10:00:00-03:00"), agora)).toBe("6 dias");
  });

  it("tempo relativo curto", () => {
    expect(formatarRelativo(new Date(agora.getTime() - 25 * 60 * 1000), agora)).toBe("há 25 min");
    expect(formatarRelativo(new Date(agora.getTime() - 2 * 60 * 60 * 1000), agora)).toBe("há 2 h");
    expect(formatarRelativo(new Date("2026-10-19T21:00:00-03:00"), agora)).toBe("ontem");
  });

  it("iniciais e normalização", () => {
    expect(iniciais("Ana Maria Souza")).toBe("AS");
    expect(iniciais("joão")).toBe("J");
    expect(normalizar(" Guarda-Chuva Ação ")).toBe("guarda-chuva acao");
  });
});
