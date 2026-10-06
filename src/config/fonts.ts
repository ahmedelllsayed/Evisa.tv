import { Cairo, Inter, Outfit, Playfair_Display } from "next/font/google";

/**
 * The reference design uses Inter (UI), Gilroy (display headings) and Denton
 * (serif destination names). Gilroy and Denton are commercial fonts, so free
 * look-alikes are used here. With licensed files, swap to `next/font/local`:
 *
 *   import localFont from "next/font/local";
 *   export const displayFont = localFont({ src: "./Gilroy-Bold.woff2", variable: "--font-display" });
 */
export const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const displayFont = Outfit({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const serifFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const arabicFont = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});

export const fontVariables = `${sansFont.variable} ${displayFont.variable} ${serifFont.variable} ${arabicFont.variable}`;
