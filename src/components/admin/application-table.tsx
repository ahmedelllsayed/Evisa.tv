import Link from "next/link";
import { AdminCard, AdminEmpty } from "@/components/admin/chrome";
import { statusLabels } from "@/components/admin/status";
import { isPastGuarantee } from "@/lib/application-rules";
import { href } from "@/lib/href";
import type { Application } from "@/lib/types";
import { formatMoney } from "@/lib/visa";

export function ApplicationTable({ locale, applications }: { locale: string; applications: Application[] }) {
  if (!applications.length) return <AdminEmpty>لا توجد طلبات في هذا التصفية.</AdminEmpty>;
  return (
    <AdminCard className="overflow-x-auto p-0">
      <ul className="divide-y divide-line md:hidden">
        {applications.map((app) => (
          <li key={app.id}>
            <Link href={href(`/admin/applications/${app.id}`, locale)} className="block px-4 py-3">
              <span className="font-medium">{app.reference}</span>
              <span className="mt-1 block text-sm">{app.destinationName}</span>
              <span className="mt-1 block text-xs text-muted-ink">{app.userEmail}</span>
              <span className="mt-1 block text-xs">{statusLabels[app.status] ?? app.status} · {formatMoney(app.totalAmount, app.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-start text-sm md:table">
        <thead>
          <tr className="border-b border-line text-muted-ink">
            <th className="px-5 py-3 font-medium">الرقم</th>
            <th className="px-5 py-3 font-medium">الوجهة</th>
            <th className="px-5 py-3 font-medium">البريد</th>
            <th className="px-5 py-3 font-medium">المسؤول</th>
            <th className="px-5 py-3 font-medium">الحالة</th>
            <th className="px-5 py-3 font-medium">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            const late = isPastGuarantee(app.status, app.guaranteedAt);
            return (
              <tr key={app.id} className="relative border-b border-line/70 last:border-0 hover:bg-brand-50">
                <td className="px-5 py-3">
                  <Link href={href(`/admin/applications/${app.id}`, locale)} className="absolute inset-0" aria-label={app.reference} />
                  <span className="relative font-medium text-ink">{app.reference}</span>
                  {late && <span className="relative mt-1 block text-xs font-medium text-red-700">متأخر</span>}
                </td>
                <td className="px-5 py-3">{app.destinationName}</td>
                <td className="px-5 py-3">{app.userEmail}</td>
                <td className="px-5 py-3">{app.assigneeEmail || "غير معيّن"}</td>
                <td className="px-5 py-3">{statusLabels[app.status] ?? app.status}</td>
                <td className="px-5 py-3">{formatMoney(app.totalAmount, app.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminCard>
  );
}
