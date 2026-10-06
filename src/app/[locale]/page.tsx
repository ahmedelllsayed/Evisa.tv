import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { HomeShell } from "@/components/home/home-shell";
import { siteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/lib/auth";
import { listDestinations, listEvents, listHolidays } from "@/lib/data/catalog";
import { getCitizenship } from "@/lib/preferences";
import { getCitizenshipCodes, getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";
import { toSearchHit } from "@/lib/search";

export default async function HomePage({ params }: Page) {
  const { locale } = await params;
  const [user, citizenship, destinations, events, holidays, settings, citizenshipCodes] = await Promise.all([
    getCurrentUser(),
    getCitizenship(),
    listDestinations(),
    listEvents(),
    listHolidays(siteConfig.market.countryCode),
    getSiteSettings(),
    getCitizenshipCodes(),
  ]);
  return (
    <>
      <HomeShell
        locale={locale}
        user={user}
        citizenship={citizenship}
        destinations={destinations}
        events={events}
        holidays={holidays}
        hits={destinations.map(toSearchHit)}
        brandName={settings.name}
        logoUrl={settings.logoUrl}
        citizenshipCodes={citizenshipCodes}
      />
      <Footer locale={locale} />
      <MobileBottomNav locale={locale} />
    </>
  );
}
