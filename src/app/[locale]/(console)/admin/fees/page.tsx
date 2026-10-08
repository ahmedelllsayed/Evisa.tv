import { AdminCard, AdminEmpty, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { listFeeChanges } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";
import { formatDateTime, formatMoney } from "@/lib/visa";

export const metadata = { title: "سجل الرسوم" };

export default async function AdminFeesPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const changes = await listFeeChanges();
  return (
    <AdminPage title="سجل الرسوم" description="يُكتب السجل تلقائيًا عند حفظ رسوم وجهة. لا يُعدَّل من هنا حتى يبقى مطابقًا لسعر الوجهة.">
      <AdminCard className="overflow-x-auto p-0">
        {changes.length === 0 ? (
          <AdminEmpty>لا توجد تغييرات على الرسوم بعد. احفظ وجهة برسوم مختلفة ليظهر السطر هنا.</AdminEmpty>
        ) : (
          <>
          <ul className="divide-y divide-line md:hidden">
            {changes.map((change) => (
              <li key={change.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{change.destinationName}</span>
                <span className="mt-1 block">{formatMoney(change.oldTotal, "EGP")} → {formatMoney(change.newTotal, "EGP")}</span>
                <span className="mt-1 block text-xs text-muted-ink">{formatDateTime(change.changedAt)}</span>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-start text-sm md:table">
            <thead>
              <tr className="border-b border-line text-muted-ink">
                <th className="px-5 py-3 font-medium">الوجهة</th>
                <th className="px-5 py-3 font-medium">السابق</th>
                <th className="px-5 py-3 font-medium">الجديد</th>
                <th className="px-5 py-3 font-medium">السبب</th>
                <th className="px-5 py-3 font-medium">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3">{change.destinationName}</td>
                  <td className="px-5 py-3">{formatMoney(change.oldTotal, "EGP")}</td>
                  <td className="px-5 py-3">{formatMoney(change.newTotal, "EGP")}</td>
                  <td className="px-5 py-3">{change.reason === "Fee updated" ? "تحديث الرسوم" : change.reason || "—"}</td>
                  <td className="px-5 py-3">{formatDateTime(change.changedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </AdminCard>
    </AdminPage>
  );
}
