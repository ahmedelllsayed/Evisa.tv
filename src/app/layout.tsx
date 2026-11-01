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
  const localeHeader = (await headers()).get("x-locale") ?? siteConfig.defaultLocale;
  const arabic = isLocale(localeHeader) && localeHeader.startsWith("ar");
  const title = (arabic ? settings.extras.seoTitleAr : settings.extras.seoTitleEn) || siteConfig.seoTitle;
  const description = (arabic ? settings.extras.seoDescriptionAr : settings.extras.seoDescriptionEn) || settings.description;
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${title} | ${settings.name}`,
      template: `%s | ${settings.name}`,
    },
    description,
    openGraph: {
      siteName: settings.name,
      type: "website",
      images: settings.extras.ogImage ? [settings.extras.ogImage] : undefined,
    },
    icons: settings.extras.favicon || settings.logoUrl ? { icon: settings.extras.favicon || settings.logoUrl } : undefined,
    alternates: { languages: { "en-EG": "/en-EG", "ar-EG": "/ar-EG" } },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const localeHeader = (await headers()).get("x-locale") ?? siteConfig.defaultLocale;
  const arabic = isLocale(localeHeader) && localeHeader.startsWith("ar");
  return (
    <html lang={arabic ? "ar" : "en"} dir={arabic ? "rtl" : "ltr"} className={`${fontVariables} h-full`} style={{ ...brandCssVariables(), colorScheme: "light" } as CSSProperties} suppressHydrationWarning>
      <body className="flex min-h-full w-full max-w-full flex-col bg-white text-black">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-black focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white">
          {arabic ? "تخطى إلى المحتوى الرئيسي" : "Skip to main content"}
        </a>
        <Providers locale={isLocale(localeHeader) ? localeHeader : siteConfig.defaultLocale}>
          <div id="main-content">
            {children}
          </div>
          <Toaster position="top-center" theme="light" />
        </Providers>
      </body>
    </html>
  );
}
