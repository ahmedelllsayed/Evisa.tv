import { AdminCard, AdminEmpty, AdminPage, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
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
          <ul className="divide-y md:hidden">
            {changes.map((change) => (
              <li key={change.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{change.destinationName}{change.optionLabel ? ` · ${change.optionLabelAr || change.optionLabel}` : ""}</span>
                <span className="mt-1 block">{formatMoney(change.oldTotal, "EGP")} → {formatMoney(change.newTotal, "EGP")}</span>
                <span className="mt-1 block text-xs text-muted-ink">{formatDateTime(change.changedAt)}</span>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-start text-sm md:table">
            <thead>
              <tr className="border-b">
                <th className={adminThClass}>الوجهة</th>
                <th className={adminThClass}>السابق</th>
                <th className={adminThClass}>الجديد</th>
                <th className={adminThClass}>السبب</th>
                <th className={adminThClass}>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.id} className={adminTrClass}>
                  <td className={adminTdClass}>{change.destinationName}{change.optionLabel ? ` · ${change.optionLabelAr || change.optionLabel}` : ""}</td>
                  <td className={adminTdClass}>{formatMoney(change.oldTotal, "EGP")}</td>
                  <td className={adminTdClass}>{formatMoney(change.newTotal, "EGP")}</td>
                  <td className={adminTdClass}>{change.reason === "Fee updated" ? "تحديث الرسوم" : change.reason || "—"}</td>
                  <td className={adminTdClass}>{formatDateTime(change.changedAt)}</td>
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
