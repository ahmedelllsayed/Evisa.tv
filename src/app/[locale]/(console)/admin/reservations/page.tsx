import Link from "next/link";
import { AdminEmpty, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { listTravelOrders, travelAttentionCount } from "@/lib/reservations/orders";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  paid: "مدفوع",
  fulfilling: "جارٍ التجهيز",
  sent: "أُرسل",
  needs_attention: "يحتاج تدخلاً",
  cancelled: "ملغى",
  refunded: "مسترد",
};

const filters = ["", "needs_attention", "pending_payment", "paid", "fulfilling", "sent", "cancelled", "refunded"];

export const metadata = { title: "الحجوزات المبدئية" };

export default async function AdminReservationsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const status = String((await searchParams).status ?? "");
  await requireAdmin(locale);
  const [orders, attention] = await Promise.all([listTravelOrders(status || undefined), travelAttentionCount()]);
  return (
    <AdminPage title="الحجوزات المبدئية" description={`${attention} طلب يحتاج تدخلاً.`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter || "all"}
            href={`${href("/admin/reservations", locale)}${filter ? `?status=${filter}` : ""}`}
            className={cn("rounded-full border px-3 py-1 text-xs", status === filter ? "border-brand bg-brand text-white" : "border-line bg-white")}
          >
            {filter ? labels[filter] : "الكل"}
          </Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <AdminEmpty>لا توجد حجوزات.</AdminEmpty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="text-start text-muted-ink">
              <tr>
                <th className="px-4 py-3 text-start">المرجع</th>
                <th className="px-4 py-3 text-start">البريد</th>
                <th className="px-4 py-3 text-start">المبلغ</th>
                <th className="px-4 py-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={href(`/admin/reservations/${order.id}`, locale)} className="font-medium text-brand">{order.reference}</Link>
                  </td>
                  <td className="px-4 py-3">{order.email}</td>
                  <td className="px-4 py-3">{order.amount} {order.currency}</td>
                  <td className="px-4 py-3">{labels[order.status] ?? order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
