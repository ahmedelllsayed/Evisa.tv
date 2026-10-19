import Link from "next/link";
import { AdminCard, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { funnelWeek } from "@/lib/data/growth";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

const labels: Record<string, string> = {
  view_visa: "عرض صفحة دولة",
  begin_application: "بدء طلب",
  travelers_done: "إكمال المسافرين",
  documents_done: "إكمال المستندات",
  reach_payment: "الوصول للدفع",
  payment_start: "بدء الدفع",
  payment_success: "نجاح الدفع",
  payment_failed: "فشل الدفع",
  offer_click: "نقرة العرض الإضافي",
};

export const metadata = { title: "القياس" };

export default async function GrowthPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const rows = await funnelWeek();
  const total = rows.reduce((sum, row) => sum + row.n, 0);
  return (
    <AdminPage title="القياس" description="أحداث آخر 7 أيام. الأرقام تبدأ من نشر هذه الصفحة، وليست تاريخاً أقدم.">
      <AdminCard>
        <p className="text-sm text-muted-ink">مجموع الأحداث</p>
        <p className="mt-1 font-display text-3xl font-semibold">{total}</p>
      </AdminCard>
      <div className="mt-4 overflow-hidden rounded-[26px] border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#f6f7fb] text-muted-ink">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الحدث</th>
              <th className="px-4 py-3 text-start font-medium">العدد</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-ink" colSpan={2}>
                  لا أحداث بعد.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.name} className="border-t border-line">
                  <td className="px-4 py-3">{labels[row.name] ?? row.name}</td>
                  <td className="px-4 py-3">{row.n}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm">
        <Link href={href("/admin/queue?filter=followup", locale)} className="font-medium text-brand">
          افتح قائمة المتابعة
        </Link>
      </p>
    </AdminPage>
  );
}
