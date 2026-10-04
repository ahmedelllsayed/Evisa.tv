/**
 * Single source of truth for the brand. Rebranding the site for another
 * project should only require editing this file and replacing the assets in
 * `public/brand/` (logo, destination images, flags) and the fonts in
 * `src/config/fonts.ts`.
 */
export const siteConfig = {
  name: "Atlys",
  legalName: "Atlys, Inc.",
  shortTagline: "Visas On Time",
  tagline: "Visas On Time Guaranteed",
  description: "Atlys helps you plan, apply, and track visas seamlessly across the world.",
  seoTitle: "Get Visas On Time to 120+ Destinations, Guaranteed",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  locales: ["en-EG"] as const,
  defaultLocale: "en-EG",

  /** Market the site is served for: passport & residence shown by default. */
  market: {
    countryCode: "EG",
    countryName: "Egypt",
    demonym: "Egyptian",
    currency: "EGP",
    numberLocale: "en-US",
    timeZone: "Africa/Cairo",
  },

  logo: {
    /** Inline SVG component is used when `src` is null (see components/brand/logo.tsx). */
    src: null as string | null,
    width: 58,
    height: 27,
  },

  /** Brand palette. Injected as CSS variables in the root layout. */
  colors: {
    brand50: "#f1f2fd",
    brand100: "#dcddfb",
    brand200: "#b9bcf7",
    brand300: "#969af2",
    brand400: "#7379ee",
    brand500: "#5057ea",
    brand600: "#373ed0",
    brand700: "#1d24b7",
    gradientFrom: "#b165fd",
    gradientTo: "#5057ea",
    ink: "#000000",
    muted: "#69727b",
    border: "#e0e0e0",
    success: "#35cc6d",
    warning: "#ffd873",
  },

  contact: {
    generalEmail: "help@atlys.com",
    supportEmail: "support@atlys.com",
    pressEmail: "pr@atlys.com",
    partnershipsEmail: "partnerships@atlys.com",
    phone: "+1 607-208-2132",
    whatsapp: "https://wa.me/16072082132",
    offices: [
      { city: "New York", address: "447 Broadway STE 851, New York, USA" },
      { city: "Dubai", address: "3rd Floor, Burjuman Mall, Khalid Bin Al Waleed Rd - Al Mankhool - Dubai" },
      { city: "Delhi", address: "7 Khullar Farms, New Delhi, India" },
    ],
  },

  stats: {
    reviewCount: "20K+",
    rating: "4.6",
    approvalRate: "98.9%",
    visasDelivered: "1M+",
    countries: "120+",
  },

  links: {
    appStore: "https://apps.apple.com/app/atlys-visa/id1601735913",
    playStore: "https://play.google.com/store/apps/details?id=com.atlys.app",
    trustpilot: "https://www.trustpilot.com/review/atlys.com",
    careers: "https://jobs.atlys.com",
    security: "/transparency/status",
  },

  /** Features toggles for the rebrand. */
  features: {
    events: true,
    mapView: true,
    liveVideoCall: true,
    askAi: true,
  },
} as const;

export type SiteConfig = typeof siteConfig;
export type Locale = (typeof siteConfig.locales)[number];

export function isLocale(value: string): value is Locale {
  return (siteConfig.locales as readonly string[]).includes(value);
}

export function brandCssVariables(): Record<string, string> {
  const c = siteConfig.colors;
  return {
    "--brand-50": c.brand50,
    "--brand-100": c.brand100,
    "--brand-200": c.brand200,
    "--brand-300": c.brand300,
    "--brand-400": c.brand400,
    "--brand-500": c.brand500,
    "--brand-600": c.brand600,
    "--brand-700": c.brand700,
    "--brand-gradient-from": c.gradientFrom,
    "--brand-gradient-to": c.gradientTo,
    "--ink": c.ink,
    "--muted-ink": c.muted,
    "--line": c.border,
    "--success": c.success,
    "--warning": c.warning,
  };
}
