import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
