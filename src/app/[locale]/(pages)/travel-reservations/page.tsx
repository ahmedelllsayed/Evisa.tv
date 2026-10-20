import { ReservationForm } from "@/components/reservations/reservation-form";
import { getSiteSettings } from "@/lib/data/settings";
import { isArabicLocale } from "@/lib/i18n";
import type { Page } from "@/lib/page";
import { openServices, reservationFees } from "@/lib/reservations/quote";
import type { ReservationServices } from "@/lib/reservations/pricing";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/travel-reservations", {
    en: "Travel reservations",
    ar: "حجوزات مبدئية",
  }, {
    en: "Look up a published flight and hotel, then receive the files by email after payment.",
    ar: "جدول رحلة وفندق منشوران، ثم تصلك الملفات بالبريد بعد الدفع.",
  });
}

export default async function TravelReservationsPage({ params }: Page) {
  const { locale } = await params;
  const settings = await getSiteSettings();
  const open = openServices(settings.extras);
  const extras = settings.extras;
  const arabic = isArabicLocale(locale);
  const faqs: { service: keyof ReservationServices; q: string; a: string }[] = [
    { service: "flight", q: arabic ? extras.reservationFaqFlightQAr : extras.reservationFaqFlightQEn, a: arabic ? extras.reservationFaqFlightAAr : extras.reservationFaqFlightAEn },
    { service: "hotel", q: arabic ? extras.reservationFaqHotelQAr : extras.reservationFaqHotelQEn, a: arabic ? extras.reservationFaqHotelAAr : extras.reservationFaqHotelAEn },
    { service: "itinerary", q: arabic ? extras.reservationFaqItineraryQAr : extras.reservationFaqItineraryQEn, a: arabic ? extras.reservationFaqItineraryAAr : extras.reservationFaqItineraryAEn },
  ];
  return (
    <div className={arabic ? "surface-ar" : ""}>
      <ReservationForm locale={locale} arabic={arabic} fees={reservationFees(extras)} open={open} faqs={faqs} />
    </div>
  );
}
