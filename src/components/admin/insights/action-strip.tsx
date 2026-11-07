import Link from "next/link";
import type { ReactNode } from "react";
import { Pill, type Tone } from "@/components/admin/chrome";
import { count, relativeTime } from "@/components/admin/format";
import { cn } from "@/lib/utils";

export type ActionCell = {
  key: string;
  label: string;
  count: number;
  href: string;
  oldest: string | null;
  tone: Exclude<Tone, "neutral" | "success">;
  detail?: string;
};

const countTone: Record<ActionCell["tone"], string> = {
  danger: "text-rose-300",
  warning: "text-amber-200",
  info: "text-sky-300",
};

const accent: Record<ActionCell["tone"], string> = {
  danger: "bg-rose-500",
  warning: "bg-amber-400",
  info: "bg-sky-400",
};

export function ActionStrip({ items, now, action }: { items: ActionCell[]; now: Date; action?: ReactNode }) {
  const open = items.filter((item) => item.count > 0);
  const urgent = open.filter((item) => item.tone === "danger").length;
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("relative flex size-2.5 shrink-0", open.length === 0 && "hidden")}>
            <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", urgent ? "bg-rose-500" : "bg-amber-400")} />
            <span className={cn("relative inline-flex size-2.5 rounded-full", urgent ? "bg-rose-500" : "bg-amber-400")} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">يحتاج إجراء الآن</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {open.length === 0 ? "لا يوجد ما ينتظر الفريق. كل القوائم فارغة." : `${open.length} من ${items.length} قوائم فيها عناصر تنتظر. ابدأ بالأحمر.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {open.length === 0 ? <Pill tone="success" dot>كل شيء تحت السيطرة</Pill> : null}
          {action}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => {
          const active = item.count > 0;
          return (
            <Link key={item.key} href={item.href} className="group relative block min-w-0 bg-card px-4 py-4 transition-colors hover:bg-accent/40 sm:px-5">
              <span className={cn("absolute inset-y-3 start-0 w-0.5 rounded-full", active ? accent[item.tone] : "bg-transparent")} />
              <p className="truncate text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className={cn("mt-1.5 font-mono text-2xl font-semibold tabular-nums", active ? countTone[item.tone] : "text-muted-foreground/50")}>{count(item.count)}</p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {active ? (item.oldest ? `الأقدم ${relativeTime(item.oldest, now)}` : item.detail ?? "") : "لا شيء معلّق"}
              </p>
              {active && item.detail && item.oldest ? <p className="truncate text-[11px] text-muted-foreground/70">{item.detail}</p> : null}
              <span className="absolute end-3 top-3 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">↗</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
