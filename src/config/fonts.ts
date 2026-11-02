import localFont from "next/font/local";

/**
 * Font files live in this folder so production builds do not download from
 * Google Fonts. Inter, Outfit, Playfair Display, IBM Plex Sans Arabic, Cairo,
 * and Lato are SIL Open Font License 1.1. See ./fonts/OFL.txt.
 */

export const sansFont = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const displayFont = localFont({
  src: "./fonts/outfit-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-display",
  display: "swap",
});

export const serifFont = localFont({
  src: "./fonts/playfair-display-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-serif",
  display: "swap",
});

export const arabicFont = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
});

export const arabicLatinFont = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-arabic-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-arabic-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-arabic-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-arabic-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic-latin",
  display: "swap",
});

export const adminCairo = localFont({
  src: [
    { path: "./fonts/cairo-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cairo-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cairo-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-admin-cairo",
  display: "swap",
});

export const adminCairoLatin = localFont({
  src: [
    { path: "./fonts/cairo-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cairo-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cairo-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-admin-cairo-latin",
  display: "swap",
});

export const adminLato = localFont({
  src: [
    { path: "./fonts/lato-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/lato-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-admin-lato",
  display: "swap",
});

export const fontVariables = `${sansFont.variable} ${displayFont.variable} ${serifFont.variable} ${arabicFont.variable} ${arabicLatinFont.variable}`;
