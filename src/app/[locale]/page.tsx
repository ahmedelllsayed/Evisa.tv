import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { HomeShell } from "@/components/home/home-shell";
import { siteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/lib/auth";
import { unreadNotificationCount } from "@/lib/data/notifications";
import { listDestinations, listEvents, listHolidays } from "@/lib/data/catalog";
import { isArabicLocale } from "@/lib/i18n";
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
  const arabic = isArabicLocale(locale);
  const announcement = arabic ? settings.extras.announcementAr : settings.extras.announcementEn;
  const unread = user ? await unreadNotificationCount(user.id) : 0;
  return (
    <>
      {announcement && <p className="bg-brand px-4 py-2 text-center text-sm text-white">{announcement}</p>}
      <HomeShell
        locale={locale}
        user={user}
        unread={unread}
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
      <Footer locale={locale} />
      <MobileBottomNav locale={locale} />
    </>
  );
}
