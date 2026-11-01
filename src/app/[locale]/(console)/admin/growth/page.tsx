import Link from "next/link";
import { AdminBarChart } from "@/components/admin/admin-charts";
import { AdminCard, AdminPage, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
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
        <p className="text-sm text-muted-foreground">مجموع الأحداث</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{total}</p>
      </AdminCard>
      <AdminCard>
        <p className="text-sm font-medium">الأحداث خلال 7 أيام</p>
        <div className="mt-4">
          <AdminBarChart data={rows.map((row) => ({ label: labels[row.name] ?? row.name, n: row.n }))} />
        </div>
      </AdminCard>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className={adminThClass}>الحدث</th>
              <th className={adminThClass}>العدد</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={2}>
                  لا أحداث بعد.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.name} className={adminTrClass}>
                  <td className={adminTdClass}>{labels[row.name] ?? row.name}</td>
                  <td className={adminTdClass}>{row.n}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm">
        <Link href={href("/admin/queue?filter=followup", locale)} className="text-sm font-medium underline-offset-4 hover:underline">
          افتح قائمة المتابعة
        </Link>
      </p>
    </AdminPage>
  );
}
