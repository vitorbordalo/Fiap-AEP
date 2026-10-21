import "server-only";
import { getCache } from "@vercel/functions";
import type { Retrato } from "./montagem";
import { ehMarcadorDeFoto, MARCADOR_FOTO, retratoDeJson, retratoParaJson } from "./retrato-json";

/**
 * Na Vercel, cada função (e cada instância dela) tem a sua própria memória: o item cadastrado numa
 * Server Action sumia na tela seguinte. Lá, a demonstração guarda o retrato na Runtime Cache, que todas
 * as funções da região enxergam. Localmente (npm run dev e npm run demo) nada disso liga: a memória do processo basta.
 * Continua sendo demonstração: os dados voltam ao início com um deploy novo, depois de um dia ou se o cache for esvaziado.
 */
export const DEMO_COMPARTILHADA = process.env.VERCEL === "1";

const VALIDADE = 24 * 60 * 60; // segundos
// um retrato por deploy: um deploy novo começa do seed, sem ler um formato antigo
const CHAVE = `demo:${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}:retrato`;

// cada chave da Runtime Cache aceita até 2 MB, então as fotos ficam à parte do retrato.
// Uma foto nunca muda depois de guardada: dá para lembrar dela nesta instância.
const fotos = new Map<string, string>(); // marcador -> data URL
const marcadorDoItem = new Map<string, string>(); // id do item -> marcador

export async function carregarRetrato(): Promise<Retrato | null> {
  const texto = await getCache().get(CHAVE);
  if (typeof texto !== "string") return null;

  const retrato = retratoDeJson(texto);
  await Promise.all(
    retrato.itens
      .filter((item) => ehMarcadorDeFoto(item.fotoUrl))
      .map(async (item) => {
        const marcador = item.fotoUrl;
        marcadorDoItem.set(item.id, marcador);
        if (!fotos.has(marcador)) {
          const foto = await getCache().get(marcador);
          if (typeof foto === "string") fotos.set(marcador, foto);
        }
        // foto expirada: a ilustração da categoria, como no seed
        const icone = retrato.categorias.find((c) => c.id === item.categoriaId)?.icone ?? "package";
        item.fotoUrl = fotos.get(marcador) ?? `/seed/${icone}.svg`;
      }),
  );
  return retrato;
}

export async function guardarRetrato(retrato: Retrato) {
  const itens = retrato.itens.map((item) => ({ ...item, fotoUrl: marcadorDoItem.get(item.id) ?? item.fotoUrl }));
  await getCache().set(CHAVE, retratoParaJson({ ...retrato, itens }), { ttl: VALIDADE, name: "retrato da demonstração" });
}

/** Guarda a foto (data URL) e devolve o marcador que vai no item. */
export async function guardarFoto(dataUrl: string) {
  const marcador = `${MARCADOR_FOTO}${crypto.randomUUID()}`;
  await getCache().set(marcador, dataUrl, { ttl: VALIDADE, name: "foto da demonstração" });
  fotos.set(marcador, dataUrl);
  return marcador;
}
