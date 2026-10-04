import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  images: {
    qualities: [60, 75, 90],
    remotePatterns: [{ protocol: "https", hostname: "flagcdn.com" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
  },
  async redirects() {
    return [
      { source: "/:locale/turkey-e-visa", destination: "/:locale/visa/turkey-visa", permanent: true },
      { source: "/:locale/morocco-e-visa", destination: "/:locale/visa/morocco-visa", permanent: true },
    ];
  },
};

export default nextConfig;
