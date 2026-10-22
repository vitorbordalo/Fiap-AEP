import "server-only";
import { getCache, type RuntimeCache } from "@vercel/functions";
import type { Retrato } from "./montagem";
import { ehMarcadorDeFoto, MARCADOR_FOTO, retratoDeJson, retratoParaJson } from "./retrato-json";

/**
 * Na Vercel, cada função (e cada instância dela) tem a sua própria memória: o item cadastrado numa
 * Server Action sumia na tela seguinte. Lá, a demonstração guarda o retrato na Runtime Cache, que todas
 * as funções da região enxergam. Localmente (npm run dev e npm run demo) nada disso liga: a memória do processo basta.
 * Continua sendo demonstração: os dados voltam ao início com um deploy novo, depois de uma semana sem
 * cadastros ou se o cache for esvaziado.
 */
export const DEMO_COMPARTILHADA = process.env.VERCEL === "1";

/** O pedaço da Runtime Cache que a demonstração usa (os testes passam um Map no lugar). */
export type Armazenamento = Pick<RuntimeCache, "get" | "set">;

// uma semana: a apresentação não perde os dados no meio do dia. A Runtime Cache ainda pode descartar
// a chave antes disso (ela é efêmera), e aí todas as instâncias recomeçam do seed juntas (abrirRetrato).
const VALIDADE = 7 * 24 * 60 * 60; // segundos
// um retrato por deploy: um deploy novo começa do seed, sem ler um formato antigo
const CHAVE = `demo:${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}:retrato`;

// Cada chave da Runtime Cache aceita até 2 MB, então as fotos ficam à parte do retrato.
// Uma foto nunca muda depois de guardada: dá para lembrar dela nesta instância.
const fotos = new Map<string, string>(); // marcador -> data URL
// Ao carregar, o marcador de cada foto vira a data URL (para as telas); ao guardar, volta a ser o marcador.
const marcadoresDoRetrato = new WeakMap<Retrato, Map<string, string>>(); // retrato -> (id do item -> marcador)

export async function carregarRetrato(cache: Armazenamento = getCache()): Promise<Retrato | null> {
  const texto = await cache.get(CHAVE);
  if (typeof texto !== "string") return null;

  const retrato = retratoDeJson(texto);
  const marcadores = new Map<string, string>();
  await Promise.all(
    retrato.itens
      .filter((item) => ehMarcadorDeFoto(item.fotoUrl))
      .map(async (item) => {
        const marcador = item.fotoUrl;
        marcadores.set(item.id, marcador);
        if (!fotos.has(marcador)) {
          const foto = await cache.get(marcador);
          if (typeof foto === "string") fotos.set(marcador, foto);
        }
        // foto expirada: a ilustração da categoria, como no seed
        const icone = retrato.categorias.find((c) => c.id === item.categoriaId)?.icone ?? "package";
        item.fotoUrl = fotos.get(marcador) ?? `/seed/${icone}.svg`;
      }),
  );
  marcadoresDoRetrato.set(retrato, marcadores);
  return retrato;
}

export async function guardarRetrato(retrato: Retrato, cache: Armazenamento = getCache()) {
  const marcadores = marcadoresDoRetrato.get(retrato);
  const itens = retrato.itens.map((item) => ({ ...item, fotoUrl: marcadores?.get(item.id) ?? item.fotoUrl }));
  await cache.set(CHAVE, retratoParaJson({ ...retrato, itens }), { ttl: VALIDADE, name: "retrato da demonstração" });
}

/**
 * Retrato compartilhado; se ainda não existe (deploy novo, chave expirada ou descartada), começa do seed
 * e já guarda. Assim todas as instâncias passam a ler o mesmo retrato, em vez de cada uma seguir com o seu.
 */
export async function abrirRetrato(semear: () => Retrato, cache: Armazenamento = getCache()): Promise<Retrato> {
  const salvo = await carregarRetrato(cache);
  if (salvo) return salvo;
  const novo = semear();
  await guardarRetrato(novo, cache);
  return novo;
}

/**
 * Guarda a foto (data URL) e devolve o marcador que vai no item.
 * Se o cache recusar a foto, o cadastro segue: nas outras instâncias o item aparece com a ilustração
 * da categoria, como uma foto expirada.
 */
export async function guardarFoto(dataUrl: string, cache: Armazenamento = getCache()) {
  const marcador = `${MARCADOR_FOTO}${crypto.randomUUID()}`;
  fotos.set(marcador, dataUrl);
  await cache
    .set(marcador, dataUrl, { ttl: VALIDADE, name: "foto da demonstração" })
    .catch((erro) => console.error("Demonstração: não foi possível guardar a foto.", erro));
  return marcador;
}
