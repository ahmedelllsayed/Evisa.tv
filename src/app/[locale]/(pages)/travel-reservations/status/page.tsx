import Link from "next/link";
import { StatusRefresh } from "@/components/reservations/status-refresh";
import { isArabicLocale } from "@/lib/i18n";
import type { Page } from "@/lib/page";
import { getTravelOrder } from "@/lib/reservations/orders";
import { readTravelToken } from "@/lib/reservations/token";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/travel-reservations/status", { en: "Reservation status", ar: "حالة الحجز" });
}

export default async function ReservationStatusPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const arabic = isArabicLocale(locale);
  const token = String((await searchParams).token ?? "");
  const id = readTravelToken(token);
  const order = id ? await getTravelOrder(id) : null;
  if (!order) return <p className="px-5 py-20 text-center text-sm">{arabic ? "الرابط غير صالح." : "This link is not valid."}</p>;
  const preparing = order.status === "paid" || order.status === "fulfilling" || order.status === "pending_payment";
  const title = order.status === "sent"
    ? arabic ? "أُرسلت الملفات" : "Files sent"
    : order.status === "needs_attention"
      ? arabic ? "نراجع الطلب" : "We are reviewing this order"
      : preparing
        ? arabic ? "جارٍ التجهيز" : "Preparing your files"
        : order.reference;
  return (
    <div className={`${isArabicLocale(locale) ? "surface-ar" : ""} mx-auto max-w-lg px-5 py-16`}>
      <h1 className="text-3xl font-semibold text-[#16182b]">{title}</h1>
      <p className="mt-2 text-sm text-muted-ink">{order.reference}</p>
      {order.flightPnr && <p className="mt-4 text-sm">{arabic ? "رقم حجز الطيران" : "Flight reference"}: {order.flightPnr}</p>}
      {order.hotelConfirmation && <p className="mt-1 text-sm">{arabic ? "تأكيد الفندق" : "Hotel confirmation"}: {order.hotelConfirmation}</p>}
      <div className="mt-6 space-y-2">
        {order.files.map((file) => (
          <Link key={file.kind} href={`/api/reservations/${order.id}/file?kind=${file.kind}&token=${encodeURIComponent(token)}`} className="block rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium">
            {file.name}
          </Link>
        ))}
      </div>
      {preparing && <StatusRefresh active />}
    </div>
  );
}
