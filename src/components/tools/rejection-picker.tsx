"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { countries, countryName } from "@/lib/countries";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";

export function RejectionPicker({
  locale,
  brandName,
  title = "We don't cover this one yet.",
  intro = "Recovery isn't available for this destination in your region right now. Pick another country to see its rejection rate and recovery odds.",
}: {
  locale: string;
  brandName: string;
  title?: string;
  intro?: string;
}) {
  const [code, setCode] = useState("VN");
  const name = useMemo(() => countryName(code, locale), [code, locale]);
  return (
    <section className="mx-auto flex min-h-[52vh] max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-ink uppercase">{t(locale, "reject.kicker")}</p>
      <h1 className="font-serif mt-4 text-4xl leading-tight font-medium md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-body">{intro.replace("this destination", name)}</p>
      <label className="mt-6 w-full max-w-xs text-start text-xs font-medium text-muted-ink">
        {t(locale, "reject.destination")}
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 h-11 w-full rounded-full border border-line bg-white px-4 text-sm text-ink"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {countryName(c.code, locale)}
            </option>
          ))}
        </select>
      </label>
      <Link href={href("/", locale)} className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
        {t(locale, "reject.browse")}
      </Link>
      <p className="mt-8 max-w-sm text-xs text-muted-ink">
        {brandName} currently publishes rejection recovery for a limited set of routes. Visa applications for covered destinations still include the on-time guarantee.
      </p>
    </section>
  );
}
