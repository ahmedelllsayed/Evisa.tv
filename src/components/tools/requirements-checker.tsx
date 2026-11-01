"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { siteConfig } from "@/config/site.config";
import { countries, countryName } from "@/lib/countries";
import { visaHref } from "@/lib/href";
import { t, tf } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import type { Destination } from "@/lib/types";
import { formatMoney, processingLabel, totalFee, visaTypeLabel } from "@/lib/visa";
import { cn } from "@/lib/utils";

export function RequirementsChecker({
  destinations,
  locale,
  passport: initialPassport,
}: {
  destinations: Destination[];
  locale: string;
  passport: string;
}) {
  const [passport, setPassport] = useState<string>(initialPassport);
  const [slug, setSlug] = useState("");
  const [purpose, setPurpose] = useState<"tourism" | "business">("tourism");
  const dest = useMemo(() => destinations.find((d) => d.slug === slug), [destinations, slug]);

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-[28px] bg-white p-4 text-start shadow-[0_20px_60px_rgba(40,40,80,0.08)] sm:p-6">
      <div className="mb-4 flex gap-2">
        {(["tourism", "business"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPurpose(p)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium", purpose === p ? "bg-brand text-white" : "bg-surface text-muted-ink")}
          >
            {t(locale, p === "tourism" ? "tool.tourism" : "tool.business")}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-medium text-muted-ink">
          {t(locale, "tool.passport")}
          <select value={passport} onChange={(e) => setPassport(e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-line px-3 text-sm text-ink">
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{countryName(c.code, locale)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-ink">
          {t(locale, "tool.destination")}
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-line px-3 text-sm text-ink">
            <option value="">{t(locale, "citizen.search")}</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>{localizedDestinationName(d, locale)}</option>
            ))}
          </select>
        </label>
        <button type="button" className="h-12 rounded-full bg-brand px-5 text-sm font-medium text-white">
          {t(locale, "tool.check")}
        </button>
      </div>
      {dest && (
        <div className="mt-5 rounded-2xl bg-surface p-4">
          {passport !== siteConfig.market.countryCode && (
            <div className="mb-3 text-sm text-brand-700">
              <p>{tf(locale, "home.passportNote", { demonym: siteConfig.market.demonym, code: passport })}</p>
              {dest.sources.filter((source) => /^https?:\/\//.test(source.url)).slice(0, 2).map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-1 block text-brand underline">
                  {source.label}
                </a>
              ))}
            </div>
          )}
          {dest.visaRequired ? (
            <>
              <p className="font-display text-xl font-semibold">
                {t(locale, purpose === "business" ? "tool.business" : "tool.tourism")} · {visaTypeLabel(dest.visaType, locale)}
              </p>
              <p className="mt-1 text-sm text-body">
                {processingLabel(dest.processingHours, locale)} · {formatMoney(totalFee(dest), dest.currency, locale)}
              </p>
              <Link href={visaHref(dest.slug, locale)} className="mt-3 inline-flex text-sm font-medium text-brand">
                {tf(locale, "event.get", { name: localizedDestinationName(dest, locale) })}
              </Link>
            </>
          ) : (
            <p className="font-display text-xl font-semibold text-success">{tf(locale, "event.get", { name: localizedDestinationName(dest, locale) })} · {t(locale, "card.noVisa")}</p>
          )}
        </div>
      )}
    </div>
  );
}
