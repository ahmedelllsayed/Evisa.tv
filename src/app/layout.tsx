import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { CSSProperties } from "react";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/config/fonts";
import { brandCssVariables, isLocale, siteConfig } from "@/config/site.config";
import { getSiteSettings } from "@/lib/data/settings";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.seoTitle} | ${settings.name}`,
      template: `%s | ${settings.name}`,
    },
    description: settings.description,
    openGraph: { siteName: settings.name, type: "website" },
    icons: settings.logoUrl ? { icon: settings.logoUrl } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const localeHeader = (await headers()).get("x-locale") ?? siteConfig.defaultLocale;
  const arabic = isLocale(localeHeader) && localeHeader.startsWith("ar");
  return (
    <html lang={arabic ? "ar" : "en"} dir={arabic ? "rtl" : "ltr"} className={`${fontVariables} h-full`} style={{ ...brandCssVariables(), colorScheme: "light" } as CSSProperties} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-white text-black">
        <Providers locale={isLocale(localeHeader) ? localeHeader : siteConfig.defaultLocale}>
          {children}
          <Toaster position="top-center" theme="light" />
        </Providers>
      </body>
    </html>
  );
}
