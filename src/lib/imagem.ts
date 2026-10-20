/**
 * Compressão da foto no navegador, antes do upload: lado maior de até 1600px, em WebP.
 * Navegadores que não geram WebP (Safari antigo) caem para JPEG.
 */

const LADO_MAIOR = 1600;
const QUALIDADE = 0.82;

function paraBlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, QUALIDADE));
}

/** Redimensiona e comprime uma imagem (arquivo da galeria ou quadro da câmera). */
export async function comprimirImagem(origem: Blob | HTMLVideoElement): Promise<Blob> {
  let largura: number;
  let altura: number;
  let desenhavel: CanvasImageSource;

  if (origem instanceof Blob) {
    const bitmap = await createImageBitmap(origem);
    largura = bitmap.width;
    altura = bitmap.height;
    desenhavel = bitmap;
  } else {
    largura = origem.videoWidth;
    altura = origem.videoHeight;
    desenhavel = origem;
  }

  const escala = Math.min(1, LADO_MAIOR / Math.max(largura, altura));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(largura * escala);
  canvas.height = Math.round(altura * escala);
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Não foi possível processar a foto.");
  contexto.drawImage(desenhavel, 0, 0, canvas.width, canvas.height);
  if ("close" in desenhavel && typeof desenhavel.close === "function") desenhavel.close();

  const webp = await paraBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await paraBlob(canvas, "image/jpeg");
  if (!jpeg) throw new Error("Não foi possível processar a foto.");
  return jpeg;
}
