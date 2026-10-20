import Link from "next/link";
import { adminCancelReservation, adminRefundReservation, adminResendReservation, adminRetryReservation } from "@/app/actions/admin-reservations";
import { AdminPage, adminDangerClass, adminGhostClass, adminPrimaryClass } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { getTravelOrder } from "@/lib/reservations/orders";
import { notFound } from "next/navigation";

const labels: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  paid: "مدفوع",
  fulfilling: "جارٍ التجهيز",
  sent: "أُرسل",
  needs_attention: "يحتاج تدخلاً",
  cancelled: "ملغى",
  refunded: "مسترد",
};

export const metadata = { title: "حجز مبدئي" };

export default async function AdminReservationPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  await requireAdmin(locale);
  const order = await getTravelOrder(id);
  if (!order) notFound();
  const services = Object.entries(order.services).filter(([, on]) => on).map(([key]) => key).join("، ");
  return (
    <AdminPage title={order.reference} description={labels[order.status] ?? order.status}>
      <Link href={href("/admin/reservations", locale)} className="mb-4 inline-block text-sm text-brand">العودة للقائمة</Link>
      <dl className="grid gap-3 rounded-2xl border border-line bg-white p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-ink">البريد</dt><dd>{order.email}</dd></div>
        <div><dt className="text-muted-ink">الهاتف</dt><dd>{order.phone}</dd></div>
        <div><dt className="text-muted-ink">المسافر</dt><dd>{order.input.firstName} {order.input.lastName}</dd></div>
        <div><dt className="text-muted-ink">الخدمات</dt><dd>{services || "—"}</dd></div>
        <div><dt className="text-muted-ink">المبلغ</dt><dd>{order.amount} {order.currency}</dd></div>
        {order.error && <div className="sm:col-span-2"><dt className="text-muted-ink">ملاحظة</dt><dd>{order.error}</dd></div>}
      </dl>
      <div className="mt-4 space-y-2">
        {order.files.map((file) => (
          <a key={file.kind} href={`/api/reservations/${order.id}/file?kind=${file.kind}`} className="block text-sm text-brand">{file.name}</a>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <form action={adminRetryReservation.bind(null, locale, order.id)}><button className={adminPrimaryClass}>إعادة المحاولة</button></form>
        <form action={adminResendReservation.bind(null, locale, order.id)}><button className={adminGhostClass}>إعادة إرسال البريد</button></form>
        <form action={adminCancelReservation.bind(null, locale, order.id)}><button className={adminDangerClass}>إلغاء الطلب</button></form>
        <form action={adminRefundReservation.bind(null, locale, order.id)}><button className={adminDangerClass}>استرداد</button></form>
      </div>
    </AdminPage>
  );
}
