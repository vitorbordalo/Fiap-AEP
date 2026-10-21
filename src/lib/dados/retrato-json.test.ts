import { describe, expect, it } from "vitest";
import type { Retrato } from "./montagem";
import { ehMarcadorDeFoto, MARCADOR_FOTO, retratoDeJson, retratoParaJson } from "./retrato-json";

const encontrado = new Date("2026-10-20T13:05:00Z");

const retrato: Retrato = {
  categorias: [{ id: "c1", nome: "Garrafa", icone: "glass-water", cor: "#2563EB", fotoSensivel: false }],
  salas: [{ id: "s1", nome: "Sala 304" }],
  turmas: [{ id: "t1", nome: "2ESPH" }],
  locais: [{ id: "l1", nome: "Achados e Perdidos", horarioRetirada: "8h às 22h" }],
  perfis: [{ id: "p1", email: "monitor@fiap.com.br", nome: "Monitor", rm: null, papel: "monitor", localId: null }],
  itens: [
    {
      id: "i1",
      numero: 31,
      fotoUrl: `${MARCADOR_FOTO}abc`,
      categoriaId: "c1",
      salaId: "s1",
      turmaId: null,
      encontradoEm: encontrado,
      observacao: null,
      localId: "l1",
      cadastradoPor: "p1",
      criadoEm: encontrado,
    },
  ],
  pedidos: [{ id: "pe1", itemId: "i1", alunoId: "a1", salaId: "s1", turmaId: "t1", horario: "10:00", criadoEm: new Date("2026-10-20T15:00:00Z") }],
  retiradas: [
    {
      id: "r1",
      itemId: "i1",
      pedidoId: "pe1",
      rm: "550123",
      nome: "Mariana Costa",
      registradoPor: "e1",
      retiradoEm: new Date("2026-10-20T18:00:00Z"),
      desfeitaEm: null,
      desfeitaPor: null,
    },
  ],
  diasParaAguardando: 5,
};

describe("retrato da demonstração em JSON", () => {
  it("volta igual, com as datas como Date", () => {
    const lido = retratoDeJson(retratoParaJson(retrato));
    expect(lido).toEqual(retrato);
    expect(lido.itens[0]?.encontradoEm).toBeInstanceOf(Date);
    expect(lido.retiradas[0]?.desfeitaEm).toBeNull();
  });

  it("mantém a data de uma retirada desfeita", () => {
    const desfeita = new Date("2026-10-20T19:00:00Z");
    const comDesfeita = { ...retrato, retiradas: retrato.retiradas.map((r) => ({ ...r, desfeitaEm: desfeita, desfeitaPor: "e1" })) };
    expect(retratoDeJson(retratoParaJson(comDesfeita)).retiradas[0]?.desfeitaEm).toEqual(desfeita);
  });

  it("reconhece o marcador de foto guardada à parte", () => {
    expect(ehMarcadorDeFoto(`${MARCADOR_FOTO}abc`)).toBe(true);
    expect(ehMarcadorDeFoto("/seed/glass-water.svg")).toBe(false);
    expect(ehMarcadorDeFoto("data:image/webp;base64,AAAA")).toBe(false);
  });
});
