import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // a foto já chega comprimida (lado maior 1600px, WebP), mas fotos de câmeras antigas podem cair no fallback JPEG
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
