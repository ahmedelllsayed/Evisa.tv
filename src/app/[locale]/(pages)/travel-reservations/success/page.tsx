import { ReservationSuccess } from "@/components/reservations/success-view";
import { isArabicLocale } from "@/lib/i18n";
import type { Page } from "@/lib/page";
import { getTravelOrder } from "@/lib/reservations/orders";
import { readTravelToken, travelToken } from "@/lib/reservations/token";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/travel-reservations/success", { en: "Reservation payment", ar: "دفع الحجز" });
}

export default async function ReservationSuccessPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const token = String((await searchParams).token ?? "");
  const id = readTravelToken(token);
  const order = id ? await getTravelOrder(id) : null;
  if (!order) {
    return <p className="px-5 py-20 text-center text-sm">{isArabicLocale(locale) ? "الرابط غير صالح." : "This link is not valid."}</p>;
  }
  return (
    <div className={isArabicLocale(locale) ? "surface-ar" : ""}>
      <ReservationSuccess locale={locale} arabic={isArabicLocale(locale)} status={order.status} reference={order.reference} token={travelToken(order.id)} id={order.id} />
    </div>
  );
}
