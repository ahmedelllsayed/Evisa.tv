import Link from "next/link";
import type { ReactNode } from "react";
import { Bar, type Tone } from "@/components/admin/chrome";
import { cn } from "@/lib/utils";

export type RankedItem = {
  key: string;
  label: ReactNode;
  value: number;
  display: ReactNode;
  meta?: ReactNode;
  href?: string;
  tone?: Tone;
};

/** Compact ranked rows with an inline bar scaled to the largest value. */
export function RankedList({ items, tone = "info", empty, ranked = true }: { items: RankedItem[]; tone?: Tone; empty: ReactNode; ranked?: boolean }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((item) => item.value), 0);
  return (
    <ol className="space-y-3">
      {items.map((item, index) => {
        const body = (
          <>
            <div className="flex items-baseline gap-3">
              {ranked ? <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/70">{String(index + 1).padStart(2, "0")}</span> : null}
              <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
              {item.meta ? <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{item.meta}</span> : null}
              <span className="shrink-0 font-mono text-sm font-medium tabular-nums">{item.display}</span>
            </div>
            <div className={cn("mt-1.5", ranked && "ps-8")}>
              <Bar value={item.value} max={max} tone={item.tone ?? tone} />
            </div>
            {item.meta ? <p className={cn("mt-1 font-mono text-[11px] tabular-nums text-muted-foreground sm:hidden", ranked && "ps-8")}>{item.meta}</p> : null}
          </>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-accent/40">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
