import Link from "next/link";
import { AdminEmpty, adminThClass } from "@/components/admin/chrome";
import { StatusBadge } from "@/components/admin/status-badge";
import { attentionReasons, emptySignals, type Signals, type Sla } from "@/components/admin/applications/model";
import { DocCounts, Flag, PaidMark, ReasonTags, SlaText } from "@/components/admin/applications/parts";
import { href } from "@/lib/href";
import { localizedVisaLabel } from "@/lib/localize";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

export type QueueRow = { app: Application; sla: Sla };

function Assignee({ app, names, currentUserId }: { app: Application; names: Record<string, string>; currentUserId: string }) {
  if (!app.assigneeId) {
    return <span className={cn("text-xs", app.status === "draft" ? "text-muted-foreground/70" : "text-amber-200")}>غير معيّن</span>;
  }
  if (app.assigneeId === currentUserId) return <span className="text-xs font-medium text-primary">أنت</span>;
  return <span className="block max-w-[160px] truncate text-xs">{names[app.assigneeId] || app.assigneeEmail || "—"}</span>;
}

export function ApplicationTable({
  locale,
  rows,
  signals,
  names,
  currentUserId,
  empty,
}: {
  locale: string;
  rows: QueueRow[];
  signals: Record<string, Signals>;
  names: Record<string, string>;
  currentUserId: string;
  empty?: string;
}) {
  if (!rows.length) {
    return (
      <div className="p-5">
        <AdminEmpty title="لا شيء هنا الآن">{empty ?? "لا توجد طلبات في هذه القائمة."}</AdminEmpty>
      </div>
    );
  }
  const mobile = (
    <ul className="divide-y divide-border/70 lg:hidden">
      {rows.map(({ app, sla }) => {
        const sig = signals[app.id] ?? emptySignals;
        const visa = localizedVisaLabel(app, "ar-EG");
        return (
          <li key={app.id} className={cn("relative px-4 py-3.5", sla.state === "late" && "bg-rose-500/[0.04]")}>
            <Link href={href(`/admin/applications/${app.id}`, locale)} className="absolute inset-0" aria-label={app.reference} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold">{app.reference}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Flag src={app.destinationFlag} className="size-3.5" />
                  {app.destinationName}
                  {visa ? ` · ${visa}` : ""}
                </p>
              </div>
              <StatusBadge status={app.status} />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <SlaText sla={sla} />
              <DocCounts signals={sig} />
              <Assignee app={app} names={names} currentUserId={currentUserId} />
              {app.paidAt ? <PaidMark paid /> : null}
            </div>
            <div className="mt-2">
              <ReasonTags reasons={attentionReasons(app, sig, sla)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b">
              <th className={adminThClass}>الطلب</th>
              <th className={adminThClass}>العميل</th>
              <th className={adminThClass}>الحالة</th>
              <th className={adminThClass}>الموعد</th>
              <th className={adminThClass}>المسؤول</th>
              <th className={adminThClass}>المستندات</th>
              <th className={adminThClass}>الدفع</th>
              <th className={adminThClass}>
                <span className="sr-only">فتح</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ app, sla }) => {
              const sig = signals[app.id] ?? emptySignals;
              const visa = localizedVisaLabel(app, "ar-EG");
              const reasons = attentionReasons(app, sig, sla);
              return (
                <tr
                  key={app.id}
                  className={cn(
                    "group relative border-b border-border/70 transition-colors last:border-0 hover:bg-accent/30",
                    sla.state === "late" && "bg-rose-500/[0.04] shadow-[inset_2px_0_0_0_rgb(244_63_94)]",
                    sla.state === "soon" && "shadow-[inset_2px_0_0_0_rgb(251_191_36)]",
                  )}
                >
                  <td className="px-4 py-3 align-top">
                    <Link href={href(`/admin/applications/${app.id}`, locale)} className="absolute inset-0" aria-label={app.reference} />
                    <p className="font-mono text-[13px] font-semibold">{app.reference}</p>
                    <p className="mt-0.5 flex max-w-[260px] items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Flag src={app.destinationFlag} className="size-3.5" />
                      <span className="truncate">
                        {app.destinationName}
                        {visa ? ` · ${visa}` : ""}
                        {app.express ? " · سريع" : ""}
                      </span>
                    </p>
                    {reasons.length ? (
                      <div className="mt-1.5">
                        <ReasonTags reasons={reasons} />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="block max-w-[220px] truncate text-xs" dir="ltr">
                      {app.userEmail}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-muted-foreground tabular-nums">
                      {app.travelerCount} {app.travelerCount === 1 ? "مسافر" : "مسافرين"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <SlaText sla={sla} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Assignee app={app} names={names} currentUserId={currentUserId} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <DocCounts signals={sig} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <PaidMark paid={Boolean(app.paidAt)} />
                  </td>
                  <td className="px-4 py-3 text-end align-top">
                    <span className="inline-flex h-7 items-center rounded-md border border-input px-2.5 text-xs text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-foreground">
                      فتح
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {mobile}
    </>
  );
}
