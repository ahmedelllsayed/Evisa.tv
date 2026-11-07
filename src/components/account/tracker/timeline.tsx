"use client";

import { useState } from "react";
import { Card, SectionTitle, quietButton, relativeTime, say } from "@/components/account/ui";
import type { Tone } from "@/lib/account-insights";
import { formatAt } from "@/lib/visa";
import { cn } from "@/lib/utils";
import type { TimelineEntry } from "./events";

const dot: Record<Tone, string> = {
  brand: "bg-brand ring-brand-100",
  amber: "bg-amber-500 ring-amber-100",
  green: "bg-emerald-500 ring-emerald-100",
  red: "bg-rose-500 ring-rose-100",
  slate: "bg-slate-400 ring-slate-100",
};

const PREVIEW = 5;

export function Timeline({ locale, entries, now }: { locale: string; entries: TimelineEntry[]; now: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? entries : entries.slice(0, PREVIEW);
  return (
    <Card id="timeline" className="scroll-mt-24 sm:p-6">
      <SectionTitle
        title={say(locale, "Updates", "سجل التحديثات")}
        hint={say(locale, "Every change on this file, newest first.", "كل تغيير على الطلب، الأحدث أولاً.")}
      />
      {entries.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-muted-ink">{say(locale, "No updates yet.", "لا توجد تحديثات بعد.")}</p>
      ) : (
        <ol className="relative mt-5">
          {shown.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-4 pb-5 last:pb-0">
              {index < shown.length - 1 ? <span aria-hidden className="absolute start-[7px] top-5 bottom-0 w-px bg-[#e3e5f2]" /> : null}
              <span
                aria-hidden
                className={cn("relative mt-1 size-[15px] shrink-0 rounded-full border-[3px] border-white ring-4", dot[entry.tone], index === 0 ? "" : "opacity-80")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className={cn("text-sm text-[#16182b]", index === 0 ? "font-semibold" : "font-medium")}>{entry.title}</p>
                  <time dateTime={entry.createdAt} className="text-xs text-muted-ink" title={formatAt(entry.createdAt, locale)}>
                    {relativeTime(locale, entry.createdAt, now)}
                  </time>
                </div>
                {entry.description ? <p className="mt-1 text-sm leading-relaxed break-words text-body">{entry.description}</p> : null}
                <p className="mt-1 text-xs text-muted-ink">
                  {formatAt(entry.createdAt, locale)}
                  {entry.late ? <span className="font-medium text-amber-700"> · {say(locale, "After the target date", "بعد الموعد المستهدف")}</span> : null}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {entries.length > PREVIEW ? (
        <button type="button" onClick={() => setAll((value) => !value)} className={cn(quietButton, "mt-3 -ms-3")} aria-expanded={all}>
          {all ? say(locale, "Show fewer", "عرض أقل") : say(locale, `Show all ${entries.length} updates`, `عرض كل التحديثات (${entries.length})`)}
        </button>
      ) : null}
    </Card>
  );
}
