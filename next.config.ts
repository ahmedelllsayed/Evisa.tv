import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  images: {
    qualities: [60, 75, 90],
    remotePatterns: [{ protocol: "https", hostname: "flagcdn.com" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "32mb" },
  },
  async redirects() {
    return [
      { source: "/:locale/turkey-e-visa", destination: "/:locale/visa/turkey-visa", permanent: true },
      { source: "/:locale/morocco-e-visa", destination: "/:locale/visa/morocco-visa", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://flagcdn.com",
              "font-src 'self' data:",
              "connect-src 'self' https://accept.paymob.com https://eg.checkout.paymob.com https://api.stripe.com",
              "frame-src 'self' https://accept.paymob.com https://eg.checkout.paymob.com https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accept.paymob.com https://eg.checkout.paymob.com https://checkout.stripe.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
