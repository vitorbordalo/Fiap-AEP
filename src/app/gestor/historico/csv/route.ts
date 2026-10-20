import { type NextRequest } from "next/server";
import { localDaVisao } from "@/lib/auth/local-visao";
import { obterPerfil } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { lerFiltrosHistorico } from "@/lib/dados/filtros-historico";
import { dataIso, formatarDataHora } from "@/lib/formato";

/**
 * Célula de CSV segura: aspas escapadas e, contra injeção de fórmula no Excel,
 * um apóstrofo antes de valores que começam com = + - @.
 */
function celula(valor: string) {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

/** G2 · Exporta o histórico filtrado. Separador ";" e BOM para abrir certo no Excel em português. */
export async function GET(request: NextRequest) {
  const perfil = await obterPerfil();
  if (perfil?.role !== "gestor") return new Response("Sem permissão.", { status: 403 });

  const catalogo = await dados().catalogo();
  const filtro = lerFiltrosHistorico(request.nextUrl.searchParams, catalogo, await localDaVisao(perfil));
  const linhas = await dados().historico(filtro);

  const cabecalho = ["Código", "Categoria", "Retirado por", "RM", "Data e hora", "Local", "Registrado por", "Carteirinha", "Situação"];
  const corpo = linhas.map((l) =>
    [
      `#${l.codigo}`,
      l.categoria.nome,
      l.nome,
      l.rm,
      formatarDataHora(l.retiradoEm),
      l.local.nome,
      l.registradoPor,
      "Conferida",
      l.desfeita ? "Desfeita" : "Válida",
    ]
      .map(celula)
      .join(";"),
  );

  const csv = "﻿" + [cabecalho.map(celula).join(";"), ...corpo].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historico-retiradas-${dataIso(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
