import Link from "next/link";
import { AdminCard, AdminEmpty, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { statusLabels } from "@/components/admin/status";
import { isPastGuarantee } from "@/lib/application-rules";
import { href } from "@/lib/href";
import { localizedVisaLabel } from "@/lib/localize";
import type { Application } from "@/lib/types";
import { formatMoney } from "@/lib/visa";

export function ApplicationTable({ locale, applications }: { locale: string; applications: Application[] }) {
  if (!applications.length) return <AdminEmpty>لا توجد طلبات في هذا التصفية.</AdminEmpty>;
  return (
    <AdminCard className="overflow-x-auto p-0">
      <ul className="divide-y md:hidden">
        {applications.map((app) => (
          <li key={app.id}>
            <Link href={href(`/admin/applications/${app.id}`, locale)} className="block px-4 py-3">
              <span className="font-medium">{app.reference}</span>
              <span className="mt-1 block text-sm">{app.destinationName}</span>
              {app.visaLabel ? <span className="mt-0.5 block text-xs text-muted-ink">{localizedVisaLabel(app, locale)}{app.express ? " · سريع" : ""}</span> : null}
              <span className="mt-1 block text-xs text-muted-ink">{app.userEmail}</span>
              <span className="mt-1 block text-xs">{statusLabels[app.status] ?? app.status} · {formatMoney(app.totalAmount, app.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-start text-sm md:table">
        <thead>
          <tr className="border-b">
            <th className={adminThClass}>الرقم</th>
            <th className={adminThClass}>الوجهة</th>
            <th className={adminThClass}>البريد</th>
            <th className={adminThClass}>المسؤول</th>
            <th className={adminThClass}>الحالة</th>
            <th className={adminThClass}>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            const late = isPastGuarantee(app.status, app.guaranteedAt);
            return (
              <tr key={app.id} className={`${adminTrClass} relative`}>
                <td className={adminTdClass}>
                  <Link href={href(`/admin/applications/${app.id}`, locale)} className="absolute inset-0" aria-label={app.reference} />
                  <span className="relative font-medium text-ink">{app.reference}</span>
                  {late && <span className="relative mt-1 block text-xs font-medium text-red-700">متأخر</span>}
                </td>
                <td className={adminTdClass}>
                  {app.destinationName}
                  {app.visaLabel ? <span className="mt-0.5 block text-xs text-muted-ink">{localizedVisaLabel(app, locale)}{app.express ? " · سريع" : ""}</span> : null}
                </td>
                <td className={adminTdClass}>{app.userEmail}</td>
                <td className={adminTdClass}>{app.assigneeEmail || "غير معيّن"}</td>
                <td className={adminTdClass}>{statusLabels[app.status] ?? app.status}</td>
                <td className={adminTdClass}>{formatMoney(app.totalAmount, app.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminCard>
  );
}
