"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MediaImage } from "@/components/media-image";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";
import { matchesAll } from "./search-text";

export type GuideReason = { key: string; title: string; body: string; tip: string; count: number };

function Tip({ locale, text }: { locale: string; text: string }) {
  return (
    <span className="mt-2.5 flex gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-emerald-800">
      <span className="shrink-0 font-semibold">{say(locale, "Fix:", "الحل:")}</span>
      <span className="min-w-0">{text}</span>
    </span>
  );
}

export type GuideDestination = {
  id: string;
  name: string;
  region: string | null;
  regionLabel: string | null;
  flag: string;
  href: string;
  reasonKeys: string[];
  searchText: string;
};

const PAGE = 6;

export function RejectionGuide({
  locale,
  reasons,
  common,
  destinations,
  regions,
  contactHref,
}: {
  locale: string;
  reasons: Record<string, GuideReason>;
  common: string[];
  destinations: GuideDestination[];
  regions: { value: string; label: string }[];
  contactHref: string;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [reason, setReason] = useState("");
  const [showAll, setShowAll] = useState(false);

  const results = useMemo(
    () =>
      destinations.filter(
        (d) => (!region || d.region === region) && (!reason || d.reasonKeys.includes(reason)) && matchesAll(d.searchText, query),
      ),
    [destinations, query, region, reason],
  );
  const visible = showAll || query || region || reason ? results : results.slice(0, PAGE);
  const filtered = Boolean(query || region || reason);
  const clear = () => {
    setQuery("");
    setRegion("");
    setReason("");
  };

  return (
    <div className="min-w-0">
      {common.length ? (
        <div id="common" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-[#16182b] md:text-3xl">{say(locale, "Most common reasons", "أشهر أسباب الرفض")}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-ink md:text-base">
            {say(locale, "Tap a reason to see the destinations that list it.", "اضغط على السبب لترى الوجهات التي يظهر فيها.")}
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {common.map((key) => {
              const item = reasons[key];
              const active = reason === key;
              return (
                <li key={key} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setReason(active ? "" : key);
                      setShowAll(false);
                      document.getElementById("guide")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={cn(
                      "flex h-full w-full min-w-0 flex-col rounded-[18px] border p-5 text-start transition-colors",
                      active ? "border-brand bg-brand-50/60 ring-2 ring-brand-100" : "border-[#e3e5f2] bg-white hover:border-brand-200",
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-[#16182b]">{item.title}</span>
                      <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200 ring-inset">
                        {item.count >= destinations.length
                          ? say(locale, "Every destination", "كل الوجهات")
                          : say(locale, `${item.count} destinations`, `${item.count} ${item.count <= 10 ? "وجهات" : "وجهة"}`)}
                      </span>
                    </span>
                    {item.body ? <span className="mt-2 text-sm leading-relaxed text-body">{item.body}</span> : null}
                    {item.tip ? <Tip locale={locale} text={item.tip} /> : null}
                    <span className="mt-auto pt-3 text-xs font-semibold text-brand-700">
                      {active ? say(locale, "Showing these destinations", "تظهر هذه الوجهات الآن") : say(locale, "See destinations", "اعرض الوجهات")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div id="guide" className={cn("scroll-mt-24", common.length && "mt-14")}>
        <h2 className="text-2xl font-semibold tracking-tight text-[#16182b] md:text-3xl">{say(locale, "Notes by destination", "الملاحظات حسب الوجهة")}</h2>
        <div className="mt-5 flex min-w-0 flex-col gap-3">
          <label className="relative block min-w-0">
            <span className="sr-only">{say(locale, "Search destinations and reasons", "ابحث في الوجهات والأسباب")}</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-ink" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={say(locale, "Search a country or a reason, e.g. Türkiye or passport", "ابحث عن دولة أو سبب، مثل تركيا أو الجواز")}
              className="h-12 w-full min-w-0 rounded-full border border-[#e3e5f2] bg-white ps-11 pe-4 text-sm text-[#16182b] outline-none placeholder:text-muted-ink/80 focus:border-brand focus:ring-2 focus:ring-brand-100"
            />
          </label>
          {regions.length > 1 ? (
            <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label={say(locale, "Region", "المنطقة")}>
              {[{ value: "", label: say(locale, "All regions", "كل المناطق") }, ...regions].map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  aria-pressed={region === option.value}
                  onClick={() => setRegion(option.value)}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors",
                    region === option.value ? "border-[#16182b] bg-[#16182b] font-medium text-white" : "border-[#e3e5f2] bg-white text-[#16182b] hover:border-brand-200",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <p aria-live="polite" className="text-muted-ink">
              {say(locale, `${results.length} of ${destinations.length} destinations`, `${results.length} من ${destinations.length} وجهة`)}
            </p>
            {reason ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100 ring-inset">
                {reasons[reason]?.title}
              </span>
            ) : null}
            {filtered ? (
              <button type="button" onClick={clear} className="text-xs font-semibold text-brand-700 hover:underline">
                {say(locale, "Clear filters", "مسح الفلاتر")}
              </button>
            ) : null}
          </div>
        </div>

        {results.length ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((d) => (
              <li key={d.id} className="flex min-w-0 flex-col rounded-[22px] border border-[#e3e5f2] bg-white p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface ring-1 ring-[#e3e5f2]">
                    <MediaImage src={d.flag} alt="" width={36} height={36} className="size-9 object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#16182b]">{d.name}</span>
                    {d.regionLabel ? <span className="block text-xs text-muted-ink">{d.regionLabel}</span> : null}
                  </span>
                </div>
                <ul className="mt-4 divide-y divide-[#eceef6] border-y border-[#eceef6]">
                  {d.reasonKeys.map((key) => {
                    const item = reasons[key];
                    if (!item) return null;
                    return (
                      <li key={key}>
                        <details className="group" open={reason === key || undefined}>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-sm font-medium text-[#16182b] [&::-webkit-details-marker]:hidden">
                            <span className={cn("min-w-0", reason === key && "text-brand-700")}>{item.title}</span>
                            <span aria-hidden className="text-muted-ink transition-transform group-open:rotate-45">
                              +
                            </span>
                          </summary>
                          {item.body || item.tip ? (
                            <div className="pb-3">
                              {item.body ? <p className="text-sm leading-relaxed text-body">{item.body}</p> : null}
                              {item.tip ? <Tip locale={locale} text={item.tip} /> : null}
                            </div>
                          ) : null}
                        </details>
                      </li>
                    );
                  })}
                </ul>
                <Link href={d.href} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand-700 hover:underline">
                  {say(locale, "Visa page and documents", "صفحة التأشيرة والمستندات")}
                  <span aria-hidden className="rtl:-scale-x-100">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-[22px] border border-dashed border-[#d9dcec] bg-white px-6 py-10 text-center">
            <p className="font-semibold text-[#16182b]">{say(locale, "No destination matches that search.", "لا توجد وجهة تطابق البحث.")}</p>
            <p className="mt-1 text-sm text-muted-ink">
              {say(locale, "Try the country name in English or Arabic, or ask the team.", "جرّب اسم الدولة بالعربية أو الإنجليزية، أو اسأل الفريق.")}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={clear} className="inline-flex h-10 items-center rounded-full border border-[#e3e5f2] bg-white px-4 text-sm font-semibold text-[#16182b]">
                {say(locale, "Clear filters", "مسح الفلاتر")}
              </button>
              <Link href={contactHref} className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white">
                {say(locale, "Ask the team", "اسأل الفريق")}
              </Link>
            </div>
          </div>
        )}

        {!filtered && !showAll && results.length > PAGE ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex h-11 items-center rounded-full border border-[#e3e5f2] bg-white px-5 text-sm font-semibold text-[#16182b] hover:border-brand-200"
            >
              {say(locale, `Show all ${results.length} destinations`, `اعرض كل الوجهات (${results.length})`)}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
