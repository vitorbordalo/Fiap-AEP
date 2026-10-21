import type { Retrato } from "./montagem";

/**
 * O retrato da demonstração em texto, para guardar fora da memória do processo (ver demo-compartilhado.ts).
 * No JSON as datas viram ISO; aqui elas voltam a ser Date.
 */

/** Foto guardada à parte do retrato: o item leva só este marcador + um uuid. */
export const MARCADOR_FOTO = "demo-foto:";

export const ehMarcadorDeFoto = (fotoUrl: string) => fotoUrl.startsWith(MARCADOR_FOTO);

export function retratoParaJson(retrato: Retrato): string {
  return JSON.stringify(retrato);
}

export function retratoDeJson(texto: string): Retrato {
  const retrato = JSON.parse(texto) as Retrato;
  for (const item of retrato.itens) {
    item.encontradoEm = new Date(item.encontradoEm);
    item.criadoEm = new Date(item.criadoEm);
  }
  for (const pedido of retrato.pedidos) pedido.criadoEm = new Date(pedido.criadoEm);
  for (const retirada of retrato.retiradas) {
    retirada.retiradoEm = new Date(retirada.retiradoEm);
    retirada.desfeitaEm = retirada.desfeitaEm ? new Date(retirada.desfeitaEm) : null;
  }
  return retrato;
}
