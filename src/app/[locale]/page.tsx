import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { HomeShell } from "@/components/home/home-shell";
import { siteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/lib/auth";
import { applicationStats } from "@/lib/data/applications";
import { listDestinations, listEvents, listHolidays } from "@/lib/data/catalog";
import { isArabicLocale } from "@/lib/i18n";
import { getCitizenship } from "@/lib/preferences";
import { getCitizenshipCodes, getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";
import { toSearchHit } from "@/lib/search";

export default async function HomePage({ params }: Page) {
  const { locale } = await params;
  const [user, citizenship, destinations, events, holidays, settings, citizenshipCodes, stats] = await Promise.all([
    getCurrentUser(),
    getCitizenship(),
    listDestinations(),
    listEvents(),
    listHolidays(siteConfig.market.countryCode),
    getSiteSettings(),
    getCitizenshipCodes(),
    applicationStats(),
  ]);
  const completed = stats.find((row) => row.status === "approved")?.count ?? 0;
  const arabic = isArabicLocale(locale);
  const announcement = arabic ? settings.extras.announcementAr : settings.extras.announcementEn;
  return (
    <>
      {announcement && <p className="bg-brand px-4 py-2 text-center text-sm text-white">{announcement}</p>}
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
        showMap={settings.extras.showMap}
        showEvents={settings.extras.showEvents}
      />
      {settings.extras.showStats && (
        <section className="mx-auto grid max-w-site grid-cols-2 gap-4 px-4 py-10 text-center">
          <div>
            <p className="font-display text-3xl font-semibold">{destinations.length}</p>
            <p className="text-sm text-muted-ink">{arabic ? "وجهة" : "Destinations"}</p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold">{completed}</p>
            <p className="text-sm text-muted-ink">{arabic ? "طلبات مكتملة" : "Completed applications"}</p>
          </div>
        </section>
      )}
      <Footer locale={locale} />
      <MobileBottomNav locale={locale} />
    </>
  );
}
