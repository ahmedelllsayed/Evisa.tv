"use client";

import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { EmergencyIcon } from "@/components/brand/icons";
import { href, visaHref } from "@/lib/href";
import { t, tf } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import { matchHits, type SearchHit } from "@/lib/search";
import { formatMoney, guaranteedDate, formatDateTime, totalFee, visaTypeLabel } from "@/lib/visa";
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
  const results = useMemo(() => matchHits(hits, query), [hits, query]);

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
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t(locale, "common.close")}
          className="flex size-10 items-center justify-center rounded-full border border-line"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
        </button>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t(locale, "home.searchCountry")}
          className="h-12 flex-1 rounded-full border border-line-strong px-5 text-base outline-none focus:border-brand"
        />
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-16">
        {query.trim() && results.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-ink">{tf(locale, "search.empty", { query: query.trim() })}</p>
        )}
        <ul className="divide-y divide-line">
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
        <div className="relative size-16 overflow-hidden rounded-2xl bg-surface">
          {hit.image && <MediaImage src={hit.image} alt="" fill className="object-cover" sizes="64px" />}
        </div>
        {hit.flag && (
          <MediaImage
            src={hit.flag}
            alt=""
            width={22}
            height={22}
            className="absolute -top-1 -right-1 size-[22px] rounded-full object-cover ring-2 ring-white"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-sm tracking-wide uppercase">
          {name}
          {city && <span className="ml-2 font-sans text-xs tracking-normal text-brand normal-case">· {city}</span>}
        </p>
        {available ? (
          <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-ink">
            <span>
              {t(locale, "search.guaranteed")}
              <span className="mt-0.5 block font-medium text-ink">{formatDateTime(guaranteedDate(hit.processingHours ?? 72), locale).split(",")[0]}</span>
            </span>
            <span>
              {t(locale, "card.type")}
              <span className="mt-0.5 block font-medium text-ink">{visaTypeLabel(hit.visaType, locale)}</span>
            </span>
            <span>
              {t(locale, "card.fees")}
              <span className="mt-0.5 block font-medium text-ink">{formatMoney(totalFee(hit), hit.currency, locale)}</span>
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-ink">{t(locale, "search.noVisa")}</p>
        )}
      </div>
      <Link
        href={visaHref(hit.slug, locale)}
        onClick={onPick}
        className="shrink-0 rounded-full border border-line px-5 py-2 text-sm font-medium"
      >
        {t(locale, "visa.get")}
      </Link>
    </li>
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
