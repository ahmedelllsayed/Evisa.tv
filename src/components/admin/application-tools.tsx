"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { adminBulkAssign, adminBulkStatus, adminSetStatus } from "@/app/actions/admin";
import { AdminEmpty, adminGhostClass, adminInputClass, adminPrimaryClass, adminThClass } from "@/components/admin/chrome";
import { relativeTime } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { statusLabels } from "@/components/admin/status";
import { boardStatuses, emptySignals, manualTargets, slaFor, type Signals } from "@/components/admin/applications/model";
import { DocCounts, Flag, SlaText } from "@/components/admin/applications/parts";
import { canTransition } from "@/lib/application-status";
import { href } from "@/lib/href";
import { localizedVisaLabel } from "@/lib/localize";
import type { Application, ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/visa";

const selectClass = cn(adminInputClass, "mt-0 h-9 w-auto min-w-0 text-[13px]");

function Checkbox({ checked, onChange, label, indeterminate }: { checked: boolean; onChange: () => void; label: string; indeterminate?: boolean }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      ref={(node) => {
        if (node) node.indeterminate = Boolean(indeterminate);
      }}
      onChange={onChange}
      className="size-4 cursor-pointer rounded border-input accent-sky-400"
    />
  );
}

export function ApplicationWorkbench({
  locale,
  applications,
  staff,
  board,
  signals = {},
  names = {},
  now,
}: {
  locale: string;
  applications: Application[];
  staff: { id: string; label: string }[];
  board?: boolean;
  signals?: Record<string, Signals>;
  names?: Record<string, string>;
  now: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [assignee, setAssignee] = useState(staff[0]?.id ?? "");
  const [status, setStatus] = useState<ApplicationStatus>("in_review");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const visibleIds = applications.map((app) => app.id);
  const selectedApps = applications.filter((app) => selected.includes(app.id));
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const someSelected = selected.length > 0 && !allSelected;
  const movable = selectedApps.filter((app) => {
    if (app.status === status) return false;
    if (!canTransition(app.status, status)) return false;
    if (status === "filed") {
      const sig = signals[app.id] ?? emptySignals;
      return sig.verified > 0 && !sig.uploaded && !sig.rejected && !sig.missing;
    }
    return true;
  }).length;

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : visibleIds);
  }

  if (!applications.length) {
    return <AdminEmpty title="لا توجد نتائج">لا يطابق أي طلب هذه الفلاتر. جرّب إزالة بعضها.</AdminEmpty>;
  }

  const offBoard = board ? applications.filter((app) => !boardStatuses.includes(app.status)).length : 0;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "z-10 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg shadow-black/30 backdrop-blur transition-colors lg:sticky lg:top-2",
          selected.length ? "border-primary/40 bg-card/95" : "bg-card/80",
        )}
      >
        <label className="flex h-9 items-center gap-2 pe-2">
          <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label="تحديد كل الطلبات في الصفحة" />
          <span className={cn("whitespace-nowrap", selected.length ? "font-medium text-primary" : "text-muted-foreground")}>
            {selected.length ? `${selected.length} محدد` : "تحديد الكل"}
          </span>
        </label>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <span className="flex flex-wrap items-center gap-1.5">
          <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className={selectClass} aria-label="الموظف">
            {staff.length === 0 && <option value="">لا يوجد موظفون</option>}
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !selected.length || !assignee}
            className={adminPrimaryClass}
            onClick={() =>
              start(async () => {
                const result = await adminBulkAssign(locale, selected, assignee);
                setMessage(result.ok ? { tone: "ok", text: `عُيّن ${result.count} طلب` } : { tone: "error", text: result.error });
                if (result.ok) setSelected([]);
              })
            }
          >
            تعيين
          </button>
        </span>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <span className="flex flex-wrap items-center gap-1.5">
          <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus)} className={selectClass} aria-label="الحالة الجديدة">
            {boardStatuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value] ?? value}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !selected.length}
            className={adminGhostClass}
            onClick={() =>
              start(async () => {
                const result = await adminBulkStatus(locale, selected, status);
                setMessage(
                  result.ok
                    ? { tone: "ok", text: `تحدّث ${result.count} طلب${result.skipped ? `، وتُرك ${result.skipped} لأن الانتقال غير مسموح` : ""}` }
                    : { tone: "error", text: result.error },
                );
                if (result.ok) setSelected([]);
              })
            }
          >
            تغيير الحالة
          </button>
          {selected.length ? (
            <span className={cn("text-xs", movable === selected.length ? "text-muted-foreground" : "text-amber-200")}>
              {movable === selected.length ? `كلها تقبل «${statusLabels[status]}»` : `${movable} من ${selected.length} يقبل «${statusLabels[status]}»`}
            </span>
          ) : null}
        </span>
        {pending ? <span className="text-xs text-muted-foreground">جارٍ التنفيذ…</span> : null}
        {message && !pending ? (
          <span className={cn("ms-auto text-xs", message.tone === "error" ? "text-rose-300" : "text-emerald-300")}>{message.text}</span>
        ) : null}
      </div>

      {board ? (
        <>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {boardStatuses.map((value) => {
              const column = applications.filter((app) => app.status === value);
              return (
                <section key={value} className="flex w-[270px] shrink-0 flex-col rounded-xl border bg-card">
                  <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                    <StatusBadge status={value} />
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{column.length}</span>
                  </header>
                  <ul className="space-y-2 p-2">
                    {column.length === 0 ? <li className="px-2 py-6 text-center text-xs text-muted-foreground/70">لا طلبات</li> : null}
                    {column.map((app) => (
                      <li
                        key={app.id}
                        className={cn(
                          "rounded-lg border bg-background/60 p-2.5 text-sm transition-colors",
                          selected.includes(app.id) && "border-primary/50 bg-primary/[0.06]",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="pt-0.5">
                            <Checkbox checked={selected.includes(app.id)} onChange={() => toggle(app.id)} label={app.reference} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <Link href={href(`/admin/applications/${app.id}`, locale)} className="font-mono text-[13px] font-semibold hover:text-primary">
                              {app.reference}
                            </Link>
                            <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                              <Flag src={app.destinationFlag} className="size-3.5" />
                              {app.destinationName}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground" dir="ltr">
                              {app.userEmail}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <SlaText sla={slaFor(app, now)} />
                          <DocCounts signals={signals[app.id] ?? emptySignals} />
                        </div>
                        <QuickStatus locale={locale} app={app} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          {offBoard ? <p className="text-xs text-muted-foreground">{offBoard} طلب في مسودة أو بانتظار الدفع أو مسترد لا يظهر في اللوحة. استخدم الجدول لرؤيتها.</p> : null}
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b">
                  <th className={cn(adminThClass, "w-10 pe-0")}>
                    <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label="تحديد الكل" />
                  </th>
                  <th className={adminThClass}>الطلب</th>
                  <th className={adminThClass}>الوجهة</th>
                  <th className={adminThClass}>العميل</th>
                  <th className={adminThClass}>المسؤول</th>
                  <th className={adminThClass}>الحالة</th>
                  <th className={adminThClass}>الموعد</th>
                  <th className={adminThClass}>المستندات</th>
                  <th className={cn(adminThClass, "text-end")}>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const sla = slaFor(app, now);
                  const visa = localizedVisaLabel(app, "ar-EG");
                  const checked = selected.includes(app.id);
                  return (
                    <tr
                      key={app.id}
                      className={cn(
                        "border-b border-border/70 transition-colors last:border-0 hover:bg-accent/30",
                        checked && "bg-primary/[0.05]",
                        sla.state === "late" && "shadow-[inset_2px_0_0_0_rgb(244_63_94)]",
                      )}
                    >
                      <td className="w-10 py-3 pe-0 ps-4 align-top">
                        <span className="block pt-0.5">
                          <Checkbox checked={checked} onChange={() => toggle(app.id)} label={app.reference} />
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Link href={href(`/admin/applications/${app.id}`, locale)} className="font-mono text-[13px] font-semibold hover:text-primary">
                          {app.reference}
                        </Link>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{relativeTime(app.createdAt, new Date(now))}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="flex items-center gap-1.5">
                          <Flag src={app.destinationFlag} className="size-3.5" />
                          {app.destinationName}
                        </span>
                        {visa ? (
                          <span className="mt-0.5 block max-w-[200px] truncate text-xs text-muted-foreground">
                            {visa}
                            {app.express ? " · سريع" : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="block max-w-[220px] truncate text-xs" dir="ltr">
                          {app.userEmail}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {app.assigneeId ? (
                          <span className="block max-w-[150px] truncate text-xs">{names[app.assigneeId] || app.assigneeEmail}</span>
                        ) : (
                          <span className={cn("text-xs", app.status === "draft" ? "text-muted-foreground/70" : "text-amber-200")}>غير معيّن</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <SlaText sla={sla} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <DocCounts signals={signals[app.id] ?? emptySignals} />
                      </td>
                      <td className="px-4 py-3 text-end align-top">
                        <span className="block whitespace-nowrap font-mono text-[13px] tabular-nums">{formatMoney(app.totalAmount, app.currency)}</span>
                        <span className={cn("mt-0.5 block text-[11px]", app.paidAt ? "text-emerald-300" : "text-muted-foreground/70")}>
                          {app.paidAt ? "مدفوع" : "غير مدفوع"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border/70 lg:hidden">
            {applications.map((app) => {
              const sla = slaFor(app, now);
              return (
                <li key={app.id} className={cn("flex items-start gap-3 px-4 py-3", selected.includes(app.id) && "bg-primary/[0.05]")}>
                  <span className="pt-1">
                    <Checkbox checked={selected.includes(app.id)} onChange={() => toggle(app.id)} label={app.reference} />
                  </span>
                  <Link href={href(`/admin/applications/${app.id}`, locale)} className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{app.reference}</span>
                      <StatusBadge status={app.status} />
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Flag src={app.destinationFlag} className="size-3.5" />
                      {app.destinationName} · {formatMoney(app.totalAmount, app.currency)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground" dir="ltr">
                      {app.userEmail}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <SlaText sla={sla} />
                      <DocCounts signals={signals[app.id] ?? emptySignals} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function QuickStatus({ locale, app }: { locale: string; app: Application }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const targets = manualTargets(app.status, Boolean(app.paidAt)).filter((value) => value !== "draft" && value !== "payment_pending");
  if (!targets.length) return null;
  return (
    <>
      <select
        disabled={pending}
        value=""
        aria-label={`نقل ${app.reference}`}
        className="mt-2 h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2 text-xs text-muted-foreground outline-none focus-visible:border-primary"
        onChange={(event) => {
          const next = event.target.value as ApplicationStatus;
          if (!next) return;
          start(async () => {
            setError(null);
            const result = await adminSetStatus(locale, app.id, next, statusLabels[next] ?? next, "");
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <option value="">{pending ? "جارٍ النقل…" : "نقل إلى…"}</option>
        {targets.map((value) => (
          <option key={value} value={value}>
            {statusLabels[value] ?? value}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] text-rose-300">{error}</p> : null}
    </>
  );
}
