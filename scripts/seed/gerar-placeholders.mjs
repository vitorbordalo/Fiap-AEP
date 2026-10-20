// Gera as fotos de exemplo (public/seed/<ícone>.svg): o ícone da categoria sobre fundo cinza.
// Rode de novo se mudar a lista de ícones: node scripts/seed/gerar-placeholders.mjs
// Substitua os arquivos por fotos reais quando quiser; o seed aponta para seed/<ícone>.svg.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as lucide from "lucide-react";

const ICONES = {
  smartphone: "Smartphone",
  headphones: "Headphones",
  laptop: "Laptop",
  "plug-zap": "PlugZap",
  "glass-water": "GlassWater",
  shirt: "Shirt",
  backpack: "Backpack",
  "id-card": "IdCard",
  umbrella: "Umbrella",
  ellipsis: "Ellipsis",
};

const pasta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/seed");
await mkdir(pasta, { recursive: true });

for (const [arquivo, componente] of Object.entries(ICONES)) {
  const icone = renderToStaticMarkup(
    createElement(lucide[componente], { size: 160, color: "#8A8A8A", strokeWidth: 1.25, x: 320, y: 220 }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2E2E2E"/>
      <stop offset="1" stop-color="#1F1F1F"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#fundo)"/>
  ${icone}
</svg>
`;
  await writeFile(path.join(pasta, `${arquivo}.svg`), svg);
  console.log(`✓ public/seed/${arquivo}.svg`);
}
