"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { href } from "@/lib/href";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";
import { Stars } from "./stars";
import { defaultWallFilters, type WallFilters } from "./wall-filters";
import type { WallReview } from "./wall-model";

const PAGE = 12;

const chip = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
    active ? "border-[#ffd873] bg-[#ffd873] font-semibold text-black" : "border-white/15 text-white/80 hover:border-white/35 hover:text-white",
  );

const selectClass =
  "h-9 max-w-full min-w-0 rounded-full border border-white/15 bg-[#1b1b1f] px-3.5 text-sm text-white outline-none focus-visible:border-[#ffd873]";

function matchesRating(rating: number, filter: WallFilters["rating"]) {
  if (filter === "all") return true;
  if (filter === "3") return rating <= 3;
  return rating === Number(filter);
}

export function WallBoard({ items, locale, initial }: { items: WallReview[]; locale: string; initial: WallFilters }) {
  const [filters, setFilters] = useState(initial);
  const [shown, setShown] = useState(PAGE);

  const update = (patch: Partial<WallFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setShown(PAGE);
    const params = new URLSearchParams();
    if (next.rating !== "all") params.set("rating", next.rating);
    if (next.visa !== "all") params.set("visa", next.visa);
    if (next.verified) params.set("verified", "1");
    if (next.lang !== "all") params.set("lang", next.lang);
    if (next.sort !== "newest") params.set("sort", next.sort);
    if (!next.examples) params.set("examples", "0");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  const visas = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const item of items) {
      if (!item.visaKey || !item.visaLabel) continue;
      const row = map.get(item.visaKey) ?? { label: item.visaLabel, count: 0 };
      row.count += 1;
      map.set(item.visaKey, row);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label));
  }, [items]);

  const langs = new Set(items.map((item) => item.lang));
  const hasVerified = items.some((item) => item.verified);
  const hasSamples = items.some((item) => item.sample);
  const hasReal = items.some((item) => !item.sample);

  const visible = useMemo(() => {
    const list = items.filter(
      (item) =>
        matchesRating(item.rating, filters.rating) &&
        (filters.visa === "all" || item.visaKey === filters.visa) &&
        (!filters.verified || item.verified) &&
        (filters.lang === "all" || item.lang === filters.lang) &&
        (filters.examples || !item.sample),
    );
    return list.sort((a, b) => {
      if (a.sample !== b.sample) return a.sample ? 1 : -1;
      if (filters.sort === "top" && a.rating !== b.rating) return b.rating - a.rating;
      if (a.publishedAt !== b.publishedAt) return a.publishedAt < b.publishedAt ? 1 : -1;
      return a.order - b.order;
    });
  }, [items, filters]);

  const ratingCount = (value: WallFilters["rating"]) => items.filter((item) => matchesRating(item.rating, value)).length;
  const filtered = JSON.stringify({ ...filters, sort: "newest" }) !== JSON.stringify({ ...defaultWallFilters, sort: "newest" });

  if (!items.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-white/15 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-white">{say(locale, "No reviews yet", "لا توجد آراء بعد")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
          {say(locale, "Travelled with us? Tell us how it went and your words may appear here.", "سافرت معنا؟ أخبرنا بتجربتك وقد تظهر كلماتك هنا.")}
        </p>
        <Link href={href("/contact", locale)} className="mt-6 inline-flex h-11 items-center rounded-full bg-[#ffd873] px-5 text-sm font-semibold text-black hover:bg-[#ffcf4d]">
          {say(locale, "Share your experience", "شارك تجربتك")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
        <div className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="group" aria-label={say(locale, "Rating", "التقييم")}>
          {(
            [
              ["all", say(locale, "All ratings", "كل التقييمات")],
              ["5", say(locale, "5 stars", "5 نجوم")],
              ["4", say(locale, "4 stars", "4 نجوم")],
              ["3", say(locale, "3 or less", "3 أو أقل")],
            ] as const
          ).map(([value, label]) => {
            const count = ratingCount(value);
            if (value !== "all" && count === 0) return null;
            return (
              <button key={value} type="button" aria-pressed={filters.rating === value} onClick={() => update({ rating: value })} className={chip(filters.rating === value)}>
                {label}
                <span className={cn("tabular-nums text-xs", filters.rating === value ? "text-black/60" : "text-white/45")}>{count}</span>
              </button>
            );
          })}
          {hasVerified ? (
            <button type="button" aria-pressed={filters.verified} onClick={() => update({ verified: !filters.verified })} className={chip(filters.verified)}>
              <CheckIcon />
              {say(locale, "Verified only", "الموثّقة فقط")}
            </button>
          ) : null}
          {hasSamples && hasReal ? (
            <button type="button" aria-pressed={!filters.examples} onClick={() => update({ examples: !filters.examples })} className={chip(!filters.examples)}>
              {say(locale, "Hide examples", "إخفاء الأمثلة")}
            </button>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {visas.length > 1 ? (
            <label className="flex min-w-0 items-center gap-2 text-sm text-white/60">
              <span className="shrink-0">{say(locale, "Visa", "التأشيرة")}</span>
              <select value={filters.visa} onChange={(event) => update({ visa: event.target.value })} className={selectClass}>
                <option value="all">{say(locale, "All visas", "كل التأشيرات")}</option>
                {visas.map(([key, row]) => (
                  <option key={key} value={key}>
                    {row.label} ({row.count})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {langs.size > 1 ? (
            <label className="flex min-w-0 items-center gap-2 text-sm text-white/60">
              <span className="shrink-0">{say(locale, "Language", "اللغة")}</span>
              <select value={filters.lang} onChange={(event) => update({ lang: event.target.value as WallFilters["lang"] })} className={selectClass}>
                <option value="all">{say(locale, "All languages", "كل اللغات")}</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
          ) : null}
          <label className="flex min-w-0 items-center gap-2 text-sm text-white/60 md:ms-auto">
            <span className="shrink-0">{say(locale, "Sort", "الترتيب")}</span>
            <select value={filters.sort} onChange={(event) => update({ sort: event.target.value as WallFilters["sort"] })} className={selectClass}>
              <option value="newest">{say(locale, "Newest first", "الأحدث أولاً")}</option>
              <option value="top">{say(locale, "Highest rated", "الأعلى تقييماً")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm text-white/55" aria-live="polite">
        <p>
          {say(locale, `Showing ${Math.min(shown, visible.length)} of ${visible.length}`, `عرض ${Math.min(shown, visible.length)} من ${visible.length}`)}
        </p>
        {filtered ? (
          <button type="button" onClick={() => update({ ...defaultWallFilters, sort: filters.sort })} className="font-medium text-[#ffd873] hover:underline">
            {say(locale, "Clear filters", "مسح الفلاتر")}
          </button>
        ) : null}
      </div>

      {visible.length ? (
        <div className="mt-4 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {visible.slice(0, shown).map((item, index) => (
            <ReviewCard key={item.id} item={item} locale={locale} light={!item.sample && index % 5 === 0} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[22px] border border-dashed border-white/15 px-6 py-12 text-center">
          <p className="font-semibold text-white">{say(locale, "No reviews match these filters", "لا توجد آراء تطابق هذا الاختيار")}</p>
          <button type="button" onClick={() => update(defaultWallFilters)} className="mt-4 text-sm font-medium text-[#ffd873] hover:underline">
            {say(locale, "Show all reviews", "عرض كل الآراء")}
          </button>
        </div>
      )}

      {visible.length > shown ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShown((value) => value + PAGE)}
            className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white hover:border-white/40"
          >
            {say(locale, `Show more (${visible.length - shown})`, `عرض المزيد (${visible.length - shown})`)}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("size-3.5 fill-current", className)}>
      <path d="M8.1 14.3 3.8 10l1.4-1.4 2.9 2.9 6.7-6.7 1.4 1.4z" />
    </svg>
  );
}

function ReviewCard({ item, locale, light }: { item: WallReview; locale: string; light: boolean }) {
  const muted = light ? "text-muted-ink" : "text-white/50";
  return (
    <figure
      className={cn(
        "mb-4 break-inside-avoid rounded-[22px] border p-5",
        item.sample ? "border-dashed border-white/20 bg-transparent" : light ? "border-white bg-white text-[#16182b]" : "border-white/10 bg-white/[0.06]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Stars rating={item.rating} locale={locale} tone={light ? "light" : "dark"} />
        {item.sample ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-300/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30 ring-inset">
            {say(locale, "Example", "مثال")}
          </span>
        ) : item.verified ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
              light ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
            )}
          >
            <CheckIcon />
            {say(locale, "Verified", "موثّق")}
          </span>
        ) : null}
      </div>
      {item.title ? (
        <p dir="auto" className="mt-3 text-start font-semibold leading-snug">
          {item.title}
        </p>
      ) : null}
      <blockquote dir="auto" className={cn("mt-2 text-start text-[15px] leading-relaxed", light ? "text-body" : "text-white/75")}>
        {item.body}
      </blockquote>
      {item.visaLabel ? (
        item.visaHref ? (
          <Link
            href={item.visaHref}
            className={cn(
              "mt-4 inline-flex max-w-full items-center gap-1 truncate rounded-full px-3 py-1 text-xs font-medium",
              light ? "bg-brand-50 text-brand-700 hover:bg-brand-100" : "bg-white/10 text-white/85 hover:bg-white/15",
            )}
          >
            {item.visaLabel}
            <span aria-hidden className="rtl:-scale-x-100">
              →
            </span>
          </Link>
        ) : (
          <span className={cn("mt-4 inline-flex max-w-full truncate rounded-full px-3 py-1 text-xs font-medium", light ? "bg-[#f1f2f8] text-body" : "bg-white/10 text-white/70")}>
            {item.visaLabel}
          </span>
        )
      ) : null}
      <figcaption className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", light ? "bg-brand text-white" : "bg-[#ffd873] text-black")}>
            {item.initials}
          </span>
          <span className="min-w-0">
            <bdi className="block truncate text-sm font-medium">{item.author}</bdi>
            {item.location || item.source ? (
              <span className={cn("block truncate", muted)}>
                {item.location ? <bdi>{item.location}</bdi> : null}
                {item.location && item.source ? " · " : null}
                {item.source ? (
                  item.source.url ? (
                    <a href={item.source.url} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
                      {say(locale, "via ", "عبر ")}
                      <bdi>{item.source.label}</bdi>
                    </a>
                  ) : (
                    <>
                      {say(locale, "via ", "عبر ")}
                      <bdi>{item.source.label}</bdi>
                    </>
                  )
                ) : null}
              </span>
            ) : null}
          </span>
        </span>
        {item.date ? <time dateTime={item.publishedAt} className={cn("shrink-0", muted)}>{item.date}</time> : null}
      </figcaption>
      {item.sample ? (
        <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/50">
          {say(locale, "Illustrative example, not from a customer. Not counted in the rating.", "مثال توضيحي وليس من عميل. لا يُحتسب في التقييم.")}
        </p>
      ) : null}
    </figure>
  );
}
