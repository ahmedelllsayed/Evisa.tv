import { Footer } from "@/components/layout/footer";
import { FooterGate } from "@/components/layout/footer-gate";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentUser } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import type { Layout } from "@/lib/page";
import { getCitizenship } from "@/lib/preferences";
import { getCitizenshipCodes, getSiteSettings } from "@/lib/data/settings";
import { toSearchHit } from "@/lib/search";

export default async function PagesLayout({ children, params }: Layout) {
  const { locale } = await params;
  const [user, citizenship, destinations, settings, citizenshipCodes] = await Promise.all([
    getCurrentUser(),
    getCitizenship(),
    listDestinations(),
    getSiteSettings(),
    getCitizenshipCodes(),
  ]);
  return (
    <>
      <SiteHeader
        locale={locale}
        user={user}
        citizenship={citizenship}
        hits={destinations.map(toSearchHit)}
        brandName={settings.name}
        logoUrl={settings.logoUrl}
        whatsapp={settings.whatsapp}
        citizenshipCodes={citizenshipCodes}
      />
      <main className="flex-1">{children}</main>
      <FooterGate>
        <Footer locale={locale} />
      </FooterGate>
      <MobileBottomNav locale={locale} />
    </>
  );
}
