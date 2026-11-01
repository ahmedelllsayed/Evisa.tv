import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SiteAnalytics } from "@/components/analytics/site-analytics";
import { LiveCallWidget } from "@/components/layout/live-call-widget";
import { LocaleHtml } from "@/components/layout/locale-html";
import { PublicOnly } from "@/components/layout/public-only";
import { Providers } from "@/components/providers";
import { isLocale, siteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/data/settings";
import { isArabicLocale } from "@/lib/i18n";
import type { Layout } from "@/lib/page";

export default async function LocaleLayout({ children, params }: Layout) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [settings, user, headerStore] = await Promise.all([getSiteSettings(), getCurrentUser(), headers()]);
  const path = headerStore.get("x-pathname") ?? "";
  const admin = path.includes("/admin");
  const arabic = isArabicLocale(locale);
  const blocked = settings.extras.maintenance && !admin && user?.role !== "admin";
  return (
    <Providers locale={locale}>
      <LocaleHtml locale={locale} />
      {blocked ? (
        <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-3xl font-semibold">{settings.name}</h1>
          <p className="mt-3 text-body">{arabic ? "الموقع في وضع الصيانة. نعود قريباً." : "The site is under maintenance. Please check back soon."}</p>
        </main>
      ) : (
        children
      )}
      <PublicOnly>
        {settings.bookingUrl && siteConfig.features.liveVideoCall ? <LiveCallWidget bookingUrl={settings.bookingUrl} /> : null}
        <SiteAnalytics
          measurementId={settings.extras.gaMeasurementId}
          locale={locale}
          consentEnabled={settings.extras.consentEnabled}
          consentText={arabic ? settings.extras.consentTextAr : settings.extras.consentTextEn}
        />
      </PublicOnly>
    </Providers>
  );
}
