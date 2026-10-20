import { ReservationForm } from "@/components/reservations/reservation-form";
import { getSiteSettings } from "@/lib/data/settings";
import { isArabicLocale } from "@/lib/i18n";
import type { Page } from "@/lib/page";
import { openServices, reservationFees } from "@/lib/reservations/quote";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/travel-reservations", {
    en: "Travel reservations",
    ar: "حجوزات مبدئية",
  }, {
    en: "Hold a real flight or a refundable hotel for a visa file, then receive the documents by email.",
    ar: "حجز طيران معلّق أو فندق قابل للإلغاء لملف التأشيرة، ثم تصلك الملفات بالبريد.",
  });
}

export default async function TravelReservationsPage({ params }: Page) {
  const { locale } = await params;
  const settings = await getSiteSettings();
  const open = openServices(settings.extras);
  return (
    <div className={isArabicLocale(locale) ? "surface-ar" : ""}>
      <ReservationForm locale={locale} arabic={isArabicLocale(locale)} fees={reservationFees(settings.extras)} open={open} />
    </div>
  );
}
