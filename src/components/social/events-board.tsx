"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { MediaImage } from "@/components/media-image";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";
import { buildIcs, downloadIcs, type IcsEntry } from "./ics";
import type { ApplyTone, EventOption, EventView } from "./events-model";

export type EventFilters = { country: string; month: string };

const toneClass: Record<ApplyTone, string> = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  soon: "bg-amber-50 text-amber-900 ring-amber-200",
  tight: "bg-amber-50 text-amber-900 ring-amber-200",
  express: "bg-amber-50 text-amber-900 ring-amber-200",
  late: "bg-rose-50 text-rose-800 ring-rose-200",
};

const chip = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
    active ? "border-[#16182b] bg-[#16182b] font-semibold text-white" : "border-[#e3e5f2] bg-white text-[#16182b] hover:border-brand-200",
  );

export function EventsBoard({
  items,
  countries,
  months,
  locale,
  initial,
  note,
}: {
  items: EventView[];
  countries: EventOption[];
  months: EventOption[];
  locale: string;
  initial: EventFilters;
  note?: ReactNode;
}) {
  const [filters, setFilters] = useState(initial);

  const update = (patch: Partial<EventFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    const params = new URLSearchParams();
    if (next.country !== "all") params.set("country", next.country);
    if (next.month !== "all") params.set("month", next.month);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  const groups = useMemo(() => {
    const visible = items.filter((item) => (filters.country === "all" || item.countryCode === filters.country) && (filters.month === "all" || item.month === filters.month));
    const out: { month: EventOption; items: EventView[] }[] = [];
    for (const item of visible) {
      const last = out.at(-1);
      if (last && last.month.value === item.month) last.items.push(item);
      else out.push({ month: months.find((m) => m.value === item.month) ?? { value: item.month, label: item.month, count: 0 }, items: [item] });
    }
    return out;
  }, [items, months, filters]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const filtered = filters.country !== "all" || filters.month !== "all";

  return (
    <div>
      <div className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-[#e3e5f2] bg-white p-4 md:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <label className="flex min-w-0 items-center gap-2 text-sm text-muted-ink">
            <span className="shrink-0">{say(locale, "Country", "الدولة")}</span>
            <select
              value={filters.country}
              onChange={(event) => update({ country: event.target.value })}
              className="h-9 max-w-full min-w-0 rounded-full border border-[#e3e5f2] bg-white px-3.5 text-sm text-[#16182b] outline-none focus-visible:border-brand"
            >
              <option value="all">{say(locale, "All countries", "كل الدول")}</option>
              {countries.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted-ink md:ms-auto" aria-live="polite">
            {say(locale, `${total} of ${items.length} events`, `${total} من ${items.length} فعالية`)}
            {filtered ? (
              <>
                {" · "}
                <button type="button" onClick={() => update({ country: "all", month: "all" })} className="font-medium text-brand-700 hover:underline">
                  {say(locale, "Clear", "مسح")}
                </button>
              </>
            ) : null}
          </p>
        </div>
        {months.length > 1 ? (
          <div className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="group" aria-label={say(locale, "Month", "الشهر")}>
            <button type="button" aria-pressed={filters.month === "all"} onClick={() => update({ month: "all" })} className={chip(filters.month === "all")}>
              {say(locale, "All months", "كل الشهور")}
            </button>
            {months.map((option) => (
              <button key={option.value} type="button" aria-pressed={filters.month === option.value} onClick={() => update({ month: option.value })} className={chip(filters.month === option.value)}>
                {option.label}
                <span className={cn("text-xs tabular-nums", filters.month === option.value ? "text-white/60" : "text-muted-ink")}>{option.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {note ? <div className="mt-3 flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-ink md:text-sm">{note}</div> : null}

      {groups.length ? (
        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <section key={group.month.value} aria-labelledby={`month-${group.month.value}`}>
              <h2 id={`month-${group.month.value}`} className="flex items-baseline gap-3 text-xl font-semibold tracking-tight text-[#16182b] md:text-2xl">
                {group.month.label}
                <span className="text-sm font-normal text-muted-ink">
                  {say(locale, `${group.items.length} ${group.items.length === 1 ? "event" : "events"}`, group.items.length === 1 ? "فعالية واحدة" : group.items.length === 2 ? "فعاليتان" : `${group.items.length} فعاليات`)}
                </span>
              </h2>
              <ol className="relative mt-4 space-y-4 before:absolute before:inset-y-3 before:start-[7px] before:w-px before:bg-[#e3e5f2]">
                {group.items.map((item) => (
                  <li key={item.id} id={`event-${item.id}`} className="relative scroll-mt-28 ps-7 md:ps-9">
                    <span aria-hidden className={cn("absolute start-0 top-6 size-[15px] rounded-full border-[3px] border-white ring-1", item.daysAway <= 14 ? "bg-brand ring-brand" : "bg-[#cfd3e6] ring-[#cfd3e6]")} />
                    <EventCard item={item} locale={locale} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[22px] border border-dashed border-[#d6d9e8] bg-white px-6 py-12 text-center">
          <p className="font-semibold text-[#16182b]">{say(locale, "No events match this choice", "لا فعاليات تطابق هذا الاختيار")}</p>
          <button type="button" onClick={() => update({ country: "all", month: "all" })} className="mt-3 text-sm font-medium text-brand-700 hover:underline">
            {say(locale, "Show all events", "عرض كل الفعاليات")}
          </button>
        </div>
      )}
    </div>
  );
}

function EventCard({ item, locale }: { item: EventView; locale: string }) {
  return (
    <article className="grid min-w-0 overflow-hidden rounded-[22px] border border-[#e3e5f2] bg-white md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <div className="relative aspect-[16/9] bg-[#eef0f8] md:aspect-auto md:min-h-[220px]">
        {item.image ? <MediaImage src={item.image} alt="" fill className="object-cover" sizes="(min-width: 768px) 260px, 100vw" /> : null}
        <div className="absolute start-3 top-3 flex flex-col items-center rounded-2xl bg-white/95 px-3 py-1.5 text-center shadow-sm">
          <span className="text-xl leading-none font-semibold tabular-nums text-[#16182b]">{item.dayNumber}</span>
          <span className="mt-0.5 text-[11px] font-medium text-muted-ink">{item.monthShort}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-5 md:p-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", item.daysAway <= 14 ? "bg-brand text-white" : "bg-brand-50 text-brand-700")}>
            {item.countdown}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-muted-ink">
            <Image src={item.flag} alt="" width={20} height={15} className="h-[15px] w-5 shrink-0 rounded-[3px] object-cover" />
            <span className="truncate">
              <bdi>{item.city}</bdi>
              {say(locale, ", ", "، ")}
              {item.country}
            </span>
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-semibold text-[#16182b] md:text-xl">
            <bdi>{item.name}</bdi>
          </h3>
          <p className="mt-1 text-sm text-body">
            <time dateTime={item.startsOn}>
              {item.weekday}
              {say(locale, ", ", "، ")}
              {item.dateLabel}
            </time>
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          {item.visa.status === "free" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">{item.visa.label}</span>
          ) : item.visa.status === "required" ? (
            <>
              <span className="inline-flex items-center rounded-full bg-[#f1f2f8] px-2.5 py-1 text-xs font-medium text-[#16182b]">{item.visa.label}</span>
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{item.visa.type}</span>
            </>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#f1f2f8] px-2.5 py-1 text-xs font-medium text-body">{item.visa.label}</span>
          )}
        </div>
        {item.apply ? (
          <div className={cn("rounded-2xl px-4 py-3 ring-1 ring-inset", toneClass[item.apply.tone])}>
            <p className="text-sm font-semibold">{item.apply.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed opacity-85">{item.apply.detail}</p>
          </div>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {item.visa.status !== "free" ? (
            <Link
              href={item.visa.href}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              {item.visa.linkLabel}
            </Link>
          ) : null}
          <CalendarButton item={item} locale={locale} />
        </div>
      </div>
    </article>
  );
}

function CalendarButton({ item, locale }: { item: EventView; locale: string }) {
  const [done, setDone] = useState(false);
  const save = () => {
    const origin = window.location.origin;
    const url = item.calendar.path ? `${origin}${item.calendar.path}` : undefined;
    const entries: IcsEntry[] = [
      {
        uid: `event-${item.id}@evisa.tv`,
        date: item.startsOn,
        summary: item.calendar.summary,
        location: item.calendar.location,
        description: [item.calendar.description, url].filter(Boolean).join("\n"),
        url,
      },
    ];
    if (item.apply?.date && item.calendar.applySummary) {
      entries.push({ uid: `apply-${item.id}@evisa.tv`, date: item.apply.date, summary: item.calendar.applySummary, description: url, url });
    }
    const slug = item.name
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");
    downloadIcs(`${slug || "event"}-${item.startsOn}.ics`, buildIcs(entries, new Date()));
    setDone(true);
    window.setTimeout(() => setDone(false), 2500);
  };
  return (
    <button
      type="button"
      onClick={save}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#e3e5f2] bg-white px-4 text-sm font-semibold text-[#16182b] transition-colors hover:border-brand-200 hover:bg-brand-50/40"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
      <span aria-live="polite">{done ? say(locale, "Saved to file", "تم تنزيل الملف") : say(locale, "Add to calendar", "أضف إلى التقويم")}</span>
    </button>
  );
}
