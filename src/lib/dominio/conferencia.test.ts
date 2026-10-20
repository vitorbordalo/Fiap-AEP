import { describe, expect, it } from "vitest";
import { conferir, diferencaDeHorario } from "./conferencia";

// 22:10 em São Paulo
const encontradoEm = new Date("2026-10-19T22:10:00-03:00");
const cadastro = { salaId: "sala-304", turmaId: "2esph", encontradoEm };

describe("diferencaDeHorario", () => {
  it("calcula minutos entre horários", () => {
    expect(diferencaDeHorario("22:10", "22:00")).toBe(10);
    expect(diferencaDeHorario("08:00", "10:30")).toBe(150);
  });

  it("conta a virada da meia-noite", () => {
    expect(diferencaDeHorario("23:50", "00:20")).toBe(30);
  });

  it("recusa horários inválidos", () => {
    expect(diferencaDeHorario("25:00", "10:00")).toBeNull();
    expect(diferencaDeHorario("", "10:00")).toBeNull();
  });
});

describe("conferir", () => {
  it("tudo bate quando sala e turma são iguais e o horário está a até 60 minutos", () => {
    expect(conferir(cadastro, { salaId: "sala-304", turmaId: "2esph", horario: "21:10" })).toEqual({
      sala: true,
      turma: true,
      horario: true,
      confere: true,
    });
  });

  it("61 minutos já não bate", () => {
    const r = conferir(cadastro, { salaId: "sala-304", turmaId: "2esph", horario: "21:09" });
    expect(r.horario).toBe(false);
    expect(r.confere).toBe(false);
  });

  it("aponta cada campo divergente", () => {
    expect(conferir(cadastro, { salaId: "sala-302", turmaId: "1tdsa", horario: "22:00" })).toMatchObject({
      sala: false,
      turma: false,
      horario: true,
      confere: false,
    });
  });

  it("item sem turma não reprova a conferência", () => {
    const r = conferir({ ...cadastro, turmaId: null }, { salaId: "sala-304", turmaId: "2esph", horario: "22:30" });
    expect(r.turma).toBeNull();
    expect(r.confere).toBe(true);
  });

  it("dados em branco não batem", () => {
    expect(conferir(cadastro, { salaId: null, turmaId: null, horario: null })).toMatchObject({
      sala: false,
      turma: false,
      horario: false,
      confere: false,
    });
  });
});
