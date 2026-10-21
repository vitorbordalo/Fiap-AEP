import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // sem o selo do Next no canto (ficava sobre a troca de perfil da demonstração);
  // erros de compilação e de execução continuam aparecendo na tela em desenvolvimento
  devIndicators: false,
  // o E2E em modo Supabase compila em outra pasta para não sobrescrever o build normal
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    serverActions: {
      // a foto já chega comprimida (lado maior 1600px, WebP), mas fotos de câmeras antigas podem cair no fallback JPEG
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
