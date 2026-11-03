"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { adminAutoAssign, adminBulkAssign, adminBulkStatus, adminSetStatus } from "@/app/actions/admin";
import { AdminCard, AdminEmpty, adminPrimaryClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { statusLabels } from "@/components/admin/status";
import { isPastGuarantee } from "@/lib/application-rules";
import { href } from "@/lib/href";
import { localizedVisaLabel } from "@/lib/localize";
import type { Application, ApplicationStatus } from "@/lib/types";
import { formatMoney } from "@/lib/visa";

const bulkStatuses: ApplicationStatus[] = ["submitted", "in_review", "filed", "approved", "rejected", "cancelled"];

export function ApplicationWorkbench({
  locale,
  applications,
  staff,
  board,
}: {
  locale: string;
  applications: Application[];
  staff: { id: string; label: string }[];
  board?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [assignee, setAssignee] = useState(staff[0]?.id ?? "");
  const [status, setStatus] = useState<ApplicationStatus>("in_review");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  if (!applications.length) return <AdminEmpty>لا توجد طلبات في هذا التصفية.</AdminEmpty>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{selected.length} محدد</span>
        <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-9 rounded-md border bg-background px-2">
          {staff.length === 0 && <option value="">لا يوجد موظفون</option>}
          {staff.map((person) => (
            <option key={person.id} value={person.id}>{person.label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !selected.length || !assignee}
          className={adminPrimaryClass}
          onClick={() =>
            start(async () => {
              const result = await adminBulkAssign(locale, selected, assignee);
              setMessage(result.ok ? `عُيّن ${result.count} طلب` : result.error);
            })
          }
        >
          تعيين
        </button>
        <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus)} className="h-9 rounded-md border bg-background px-2">
          {bulkStatuses.map((value) => (
            <option key={value} value={value}>{statusLabels[value] ?? value}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !selected.length}
          className="inline-flex h-9 items-center rounded-md border px-4"
          onClick={() =>
            start(async () => {
              const result = await adminBulkStatus(locale, selected, status);
              setMessage(result.ok ? `تحدّث ${result.count} طلب${result.skipped ? `، وتُرك ${result.skipped} لأن الانتقال غير مسموح` : ""}` : result.error);
            })
          }
        >
          تغيير الحالة
        </button>
        <button
          type="button"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md border px-4"
          onClick={() =>
            start(async () => {
              const result = await adminAutoAssign(locale);
              setMessage(result.ok ? `وُزّع ${result.count} طلب على الأقل انشغالاً` : "تعذر التوزيع");
            })
          }
        >
          توزيع التلقائي
        </button>
        {message && <span className="text-muted-foreground">{message}</span>}
      </div>
      {board ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {bulkStatuses.map((value) => (
            <AdminCard key={value} className="p-3">
              <p className="text-sm font-medium">{statusLabels[value] ?? value}</p>
              <ul className="mt-2 space-y-2">
                {applications.filter((app) => app.status === value).map((app) => (
                  <li key={app.id} className="rounded-md border p-2 text-sm">
                    <label className="flex items-start gap-2">
                      <input type="checkbox" checked={selected.includes(app.id)} onChange={() => toggle(app.id)} />
                      <span>
                        <Link href={href(`/admin/applications/${app.id}`, locale)} className="font-medium">{app.reference}</Link>
                        <span className="mt-1 block text-xs text-muted-foreground">{app.destinationName}</span>
                      </span>
                    </label>
                    <QuickStatus locale={locale} id={app.id} status={app.status} />
                  </li>
                ))}
              </ul>
            </AdminCard>
          ))}
        </div>
      ) : (
        <AdminCard className="overflow-x-auto p-0">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b">
                <th className={adminThClass} />
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
                  <tr key={app.id} className={adminTrClass}>
                    <td className={adminTdClass}>
                      <input type="checkbox" checked={selected.includes(app.id)} onChange={() => toggle(app.id)} aria-label={app.reference} />
                    </td>
                    <td className={adminTdClass}>
                      <Link href={href(`/admin/applications/${app.id}`, locale)} className="font-medium">{app.reference}</Link>
                      {late && <span className="mt-1 block text-xs font-medium text-red-400">متأخر</span>}
                    </td>
                    <td className={adminTdClass}>
                      {app.destinationName}
                      {app.visaLabel ? <span className="mt-0.5 block text-xs text-muted-foreground">{localizedVisaLabel(app, locale)}{app.express ? " · سريع" : ""}</span> : null}
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
      )}
    </div>
  );
}

function QuickStatus({ locale, id, status }: { locale: string; id: string; status: ApplicationStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      disabled={pending}
      defaultValue={status}
      className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-xs"
      onChange={(event) => {
        const next = event.target.value as ApplicationStatus;
        start(async () => {
          await adminSetStatus(locale, id, next, statusLabels[next] ?? next, "");
        });
      }}
    >
      {bulkStatuses.map((value) => (
        <option key={value} value={value}>{statusLabels[value] ?? value}</option>
      ))}
    </select>
  );
}
