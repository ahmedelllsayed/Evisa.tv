import { notFound } from "next/navigation";
import { LiveCallWidget } from "@/components/layout/live-call-widget";
import { PublicOnly } from "@/components/layout/public-only";
import { isLocale, siteConfig } from "@/config/site.config";
import { getSiteSettings } from "@/lib/data/settings";
import type { Layout } from "@/lib/page";

export default async function LocaleLayout({ children, params }: Layout) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const settings = siteConfig.features.liveVideoCall ? await getSiteSettings() : null;
  return (
    <>
      {children}
      <PublicOnly>{settings?.bookingUrl ? <LiveCallWidget bookingUrl={settings.bookingUrl} /> : null}</PublicOnly>
    </>
  );
}
