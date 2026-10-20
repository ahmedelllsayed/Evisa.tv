import { completeReservationMock } from "@/app/actions/reservations";
import { isArabicLocale } from "@/lib/i18n";
import type { Page } from "@/lib/page";
import { getTravelOrder } from "@/lib/reservations/orders";
import { readTravelToken } from "@/lib/reservations/token";

export default async function ReservationMockPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const arabic = isArabicLocale(locale);
  const token = String((await searchParams).token ?? "");
  const id = readTravelToken(token);
  const order = id ? await getTravelOrder(id) : null;
  if (!order) return <p className="px-5 py-20 text-center text-sm">{arabic ? "الرابط غير صالح." : "This link is not valid."}</p>;
  return (
    <form action={completeReservationMock.bind(null, token, locale)} className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="rounded-[28px] border border-line bg-white px-6 py-10">
        <h1 className="text-2xl font-semibold">{arabic ? "دفع تجريبي" : "Test payment"}</h1>
        <p className="mt-2 text-sm text-muted-ink">{order.reference} · {order.amount} EGP</p>
        <p className="mt-3 text-sm leading-relaxed text-body">
          {arabic ? "هذا الدفع محلي فقط. بعد التأكيد يبدأ تجهيز الملفات." : "This checkout is local only. Confirming it starts the files."}
        </p>
        <button className="mt-6 h-11 rounded-full bg-brand px-6 text-sm font-medium text-white">{arabic ? "تأكيد الدفع" : "Confirm payment"}</button>
      </div>
    </form>
  );
}
