"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { siteConfig } from "@/config/site.config";
import { countries } from "@/lib/countries";
import { visaHref } from "@/lib/href";
import type { Destination } from "@/lib/types";
import { formatMoney, processingLabel, totalFee, visaTypeLabels } from "@/lib/visa";
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
    <div className="mx-auto mt-8 max-w-3xl rounded-[28px] bg-white p-4 text-left shadow-[0_20px_60px_rgba(40,40,80,0.08)] sm:p-6">
      <div className="mb-4 flex gap-2">
        {(["tourism", "business"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPurpose(p)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", purpose === p ? "bg-brand text-white" : "bg-surface text-muted-ink")}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-medium text-muted-ink">
          Passport nationality
          <select value={passport} onChange={(e) => setPassport(e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-line px-3 text-sm text-ink">
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-ink">
          Destination
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-line px-3 text-sm text-ink">
            <option value="">Where are you going?</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </select>
        </label>
        <button type="button" className="h-12 rounded-full bg-brand px-5 text-sm font-medium text-white">
          Check Requirements
        </button>
      </div>
      {dest && (
        <div className="mt-5 rounded-2xl bg-surface p-4">
          {passport !== siteConfig.market.countryCode && (
            <div className="mb-3 text-sm text-brand-700">
              <p>These figures are for {siteConfig.market.demonym} passports. This destination is not configured for the selected passport.</p>
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
                {purpose === "business" ? "Business travel" : "Tourism"} · {visaTypeLabels[dest.visaType]}
              </p>
              <p className="mt-1 text-sm text-body">
                {processingLabel(dest.processingHours)} · {formatMoney(totalFee(dest), dest.currency)}
              </p>
              <Link href={visaHref(dest.slug, locale)} className="mt-3 inline-flex text-sm font-medium text-brand">
                Open the {dest.name} visa page →
              </Link>
            </>
          ) : (
            <p className="font-display text-xl font-semibold text-success">No visa required for {dest.name}</p>
          )}
        </div>
      )}
    </div>
  );
}
