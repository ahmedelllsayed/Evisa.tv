"use client";

import { ArrowLeft, Search, TrendingUp } from "lucide-react";
import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { EmergencyIcon } from "@/components/brand/icons";
import { href, visaHref } from "@/lib/href";
import { t, tf } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import { matchHits, type SearchHit } from "@/lib/search";
import { formatDate, formatMoney, guaranteedDate, totalFee, visaTypeLabel } from "@/lib/visa";
import { cn } from "@/lib/utils";

export function CountrySearchOverlay({
  open,
  onClose,
  hits,
  locale,
  query,
  onQuery,
}: {
  open: boolean;
  onClose: () => void;
  hits: SearchHit[];
  locale: string;
  query: string;
  onQuery: (q: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? matchHits(hits, trimmed) : hits.map((hit) => ({ hit, city: null as string | null }))),
    [hits, trimmed],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-white">
      <Link
        href={href("/emergency-care", locale)}
        className="flex items-center justify-center gap-2 bg-[#e8f8ee] px-4 py-2.5 text-sm"
      >
        <EmergencyIcon className="size-3" />
        {t(locale, "search.emergency")}
      </Link>
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t(locale, "common.close")}
          className="flex size-10 items-center justify-center rounded-full border border-line"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
        </button>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-5 top-1/2 size-4 -translate-y-1/2 text-muted-ink" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t(locale, "home.searchCountry")}
            className="h-12 w-full rounded-full border border-line-strong ps-12 pe-5 text-base outline-none focus:border-brand"
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 pb-16">
        {!trimmed && results.length > 0 && (
          <p className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-ink">
            <TrendingUp className="size-3.5" />
            {t(locale, "search.trending")}
          </p>
        )}
        {trimmed && results.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-ink">{tf(locale, "search.empty", { query: trimmed })}</p>
        )}
        <ul>
          {results.map(({ hit, city }) => (
            <SearchRow key={hit.slug} hit={hit} city={city} locale={locale} onPick={onClose} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function SearchRow({
  hit,
  city,
  locale,
  onPick,
}: {
  hit: SearchHit;
  city: string | null;
  locale: string;
  onPick: () => void;
}) {
  const available = hit.visaRequired;
  const name = localizedDestinationName(hit, locale);
  return (
    <li className="flex items-center gap-4 border-b border-line py-5">
      <div className="relative size-16 shrink-0">
        <div className="relative size-16 overflow-hidden rounded-2xl bg-neutral-200">
          {hit.image && <MediaImage src={hit.image} alt="" fill className="object-cover" sizes="64px" />}
        </div>
        {hit.flag && (
          <MediaImage
            src={hit.flag}
            alt=""
            width={22}
            height={22}
            className="absolute -top-1 -end-1 size-[22px] rounded-full object-cover ring-2 ring-white"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-sm font-semibold tracking-wide uppercase">
          {name}
          {city && <span className="ms-2 font-sans text-xs font-medium tracking-normal text-brand normal-case">· {city}</span>}
        </p>
        {available ? (
          <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
            <Detail label={t(locale, "search.guaranteed")} value={formatDate(guaranteedDate(hit.processingHours ?? 72), locale)} />
            <Detail label={t(locale, "card.type")} value={visaTypeLabel(hit.visaType, locale)} />
            <Detail label={t(locale, "card.fees")} value={formatMoney(totalFee(hit), hit.currency, locale)} />
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-muted-ink">{t(locale, "search.noVisa")}</p>
        )}
      </div>
      <Link
        href={visaHref(hit.slug, locale)}
        onClick={onPick}
        className="shrink-0 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors hover:border-black hover:bg-black hover:text-white sm:px-5"
      >
        {t(locale, "visa.get")}
      </Link>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-muted-ink">
      {label}:
      <span className="mt-1 block text-sm font-semibold text-black">{value}</span>
    </p>
  );
}

export function SearchTrigger({
  onClick,
  className,
  label = "Search Country",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cn("text-start", className)}>
      {label}
    </button>
  );
}
