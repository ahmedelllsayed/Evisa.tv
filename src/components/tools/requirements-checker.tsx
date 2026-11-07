"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { siteConfig } from "@/config/site.config";
import { t, tf } from "@/lib/i18n";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";

export type CheckerPassport = { code: string; name: string };

export type CheckerDestination = {
  slug: string;
  name: string;
  search: string;
  visaRequired: boolean;
  typeLabel: string;
  processing: string;
  fee: string;
  documents: string[];
  sources: { label: string; url: string }[];
  href: string;
};

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function RequirementsChecker({
  destinations,
  passports,
  locale,
  passport: initialPassport,
  initialSlug = "",
}: {
  destinations: CheckerDestination[];
  passports: CheckerPassport[];
  locale: string;
  passport: string;
  initialSlug?: string;
}) {
  const [passport, setPassport] = useState(initialPassport);
  const [slug, setSlug] = useState(initialSlug);
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<"tourism" | "business">("tourism");
  const dest = destinations.find((item) => item.slug === slug) ?? null;
  const egyptian = passport === siteConfig.market.countryCode;
  const matches = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return [];
    return destinations.filter((item) => fold(item.search).includes(needle)).slice(0, 6);
  }, [destinations, query]);

  return (
    <div id="checker" className="mx-auto mt-8 max-w-3xl scroll-mt-24 rounded-[28px] bg-white p-4 text-start shadow-[0_20px_60px_rgba(40,40,80,0.08)] sm:p-6">
      <div className="mb-4 flex gap-2">
        {(["tourism", "business"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPurpose(item)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium", purpose === item ? "bg-brand text-white" : "bg-surface text-muted-ink")}
          >
            {t(locale, item === "tourism" ? "tool.tourism" : "tool.business")}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-muted-ink">
          {t(locale, "tool.passport")}
          <select value={passport} onChange={(event) => setPassport(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-line px-3 text-sm text-ink">
            {passports.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="relative text-xs font-medium text-muted-ink">
          {t(locale, "tool.destination")}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(locale, "citizen.search")}
            className="mt-1 h-12 w-full rounded-2xl border border-line px-3 text-sm text-ink"
          />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-line bg-white py-1 shadow-lg">
              {matches.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      setSlug(item.slug);
                      setQuery("");
                    }}
                    className="block w-full px-3 py-2 text-start text-sm hover:bg-surface"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      </div>
      {dest ? (
        <div className="mt-5 rounded-2xl bg-surface p-4">
          {!egyptian && (
            <div className="mb-3 text-sm text-brand-700">
              <p>{tf(locale, "home.passportNote", { demonym: siteConfig.market.demonym, code: passport })}</p>
              {dest.sources.slice(0, 2).map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-1 block text-brand underline">
                  {source.label}
                </a>
              ))}
            </div>
          )}
          <p className="text-xs font-medium text-muted-ink">{dest.name}</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {dest.visaRequired
              ? `${t(locale, purpose === "business" ? "tool.business" : "tool.tourism")} · ${dest.typeLabel}`
              : `${dest.name} · ${t(locale, "card.noVisa")}`}
          </p>
          {dest.visaRequired ? (
            <>
              <p className="mt-1 text-sm text-body">
                {dest.processing} · {dest.fee}
              </p>
              {purpose === "business" ? (
                <p className="mt-2 text-xs text-muted-ink">{say(locale, "Tourism and business use the same entry on this site. Confirm a business visit on the official page.", "السياحة والعمل يستخدمان نفس بيانات الوجهة هنا. تأكد من زيارة العمل في الصفحة الرسمية.")}</p>
              ) : null}
              {dest.documents.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {dest.documents.map((document) => (
                    <li key={document} className="rounded-full bg-white px-2.5 py-1 text-xs">
                      {document}
                    </li>
                  ))}
                </ul>
              )}
              <Link href={dest.href} className="mt-4 inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-medium text-white">
                {tf(locale, "event.get", { name: dest.name })}
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-ink">{say(locale, "Search for a destination to see the visa type, the fee and the documents.", "ابحث عن وجهة لترى نوع التأشيرة والرسم والمستندات.")}</p>
      )}
    </div>
  );
}
