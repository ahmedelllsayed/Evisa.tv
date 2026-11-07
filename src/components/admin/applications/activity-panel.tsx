"use client";

import { useState } from "react";
import { adminAddEvent } from "@/app/actions/admin";
import { AdminPanel, FilterChip, Pill, adminGhostClass, adminInputClass, adminTextareaClass } from "@/components/admin/chrome";
import { relativeTime, shortDateTime } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";
import type { ApplicationEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FeedbackLine, useRun } from "./use-run";

export type HistoryRow = { id: string; fromStatus: string | null; toStatus: string; actorEmail: string | null; reason: string | null; createdAt: string };

type Item =
  | { key: string; at: string; type: "public" | "internal"; event: ApplicationEvent }
  | { key: string; at: string; type: "status"; row: HistoryRow };

type Filter = "all" | "public" | "internal" | "status";

const systemReasons: Record<string, string> = {
  payment_received: "تأكيد الدفع",
  paymob_refund: "استرداد من Paymob",
};

export function ActivityPanel({
  locale,
  applicationId,
  events,
  history,
  now,
}: {
  locale: string;
  applicationId: string;
  events: ApplicationEvent[];
  history: HistoryRow[];
  now: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { pending, run, feedback } = useRun();
  const nowDate = new Date(now);

  const items: Item[] = [
    ...events.map((event) => ({ key: `e-${event.id}`, at: event.createdAt, type: event.internal ? ("internal" as const) : ("public" as const), event })),
    ...history.map((row) => ({ key: `h-${row.id}`, at: row.createdAt, type: "status" as const, row })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const count = (type: Filter) => (type === "all" ? items.length : items.filter((item) => item.type === type).length);
  const shown = filter === "all" ? items : items.filter((item) => item.type === filter);

  return (
    <div className="space-y-4">
      <AdminPanel title="ملاحظة داخلية" hint="تظهر للموظفين فقط ولا تُرسل للعميل.">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            run(() => adminAddEvent(locale, applicationId, title.trim(), description.trim()), "حُفظت الملاحظة الداخلية.", () => {
              setTitle("");
              setDescription("");
            });
          }}
        >
          <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="العنوان، مثل: اتصلت بالعميل" className={cn(adminInputClass, "mt-0")} />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="التفاصيل (اختياري)" className={adminTextareaClass} />
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending || !title.trim()} className={adminGhostClass}>
              {pending ? "جارٍ الحفظ…" : "حفظ الملاحظة"}
            </button>
            <FeedbackLine feedback={feedback} />
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title="السجل"
        hint="كل ما حدث للطلب، الأحدث أولاً."
        action={
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "الكل"],
                ["public", "للعميل"],
                ["internal", "داخلية"],
                ["status", "الحالة"],
              ] as const
            ).map(([id, label]) => (
              <FilterChip key={id} active={filter === id} onClick={() => setFilter(id)}>
                {label} <span className="font-mono tabular-nums opacity-70">{count(id)}</span>
              </FilterChip>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد شيء هنا بعد.</p>
        ) : (
          <ol className="relative space-y-3 before:absolute before:inset-y-2 before:start-[7px] before:w-px before:bg-border">
            {shown.map((item) => (
              <li key={item.key} className="relative ps-7">
                <span
                  className={cn(
                    "absolute start-0 top-3 size-[15px] rounded-full border-2 border-card",
                    item.type === "internal" ? "bg-amber-400" : item.type === "status" ? "bg-violet-400" : "bg-sky-400",
                  )}
                />
                {item.type === "status" ? (
                  <div className="rounded-lg border bg-background/40 px-3.5 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.row.fromStatus ? <StatusBadge status={item.row.fromStatus} /> : <span className="text-xs text-muted-foreground">بداية</span>}
                      <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-none stroke-muted-foreground" strokeWidth="1.5">
                        <path d="M3 8h10m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <StatusBadge status={item.row.toStatus} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      <span dir="ltr">{item.row.actorEmail || "النظام"}</span>
                      {item.row.reason ? ` · ${systemReasons[item.row.reason] ?? item.row.reason}` : ""}
                    </p>
                    <Time at={item.at} now={nowDate} />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-lg border px-3.5 py-2.5",
                      item.type === "internal" ? "border-dashed border-amber-400/40 bg-amber-400/[0.04]" : "bg-background/40",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-medium">{item.event.title}</p>
                      {item.type === "internal" ? (
                        <Pill tone="warning">
                          <svg viewBox="0 0 12 12" aria-hidden className="size-3 fill-none stroke-current" strokeWidth="1.3">
                            <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
                            <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
                          </svg>
                          داخلية
                        </Pill>
                      ) : (
                        <Pill tone="info">يراه العميل</Pill>
                      )}
                    </div>
                    {item.event.description ? <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{item.event.description}</p> : null}
                    <Time at={item.at} now={nowDate} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </AdminPanel>
    </div>
  );
}

function Time({ at, now }: { at: string; now: Date }) {
  return (
    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/80 tabular-nums">
      {shortDateTime(at)} <span className="font-sans">· {relativeTime(at, now)}</span>
    </p>
  );
}
