"use client";

import { Clock, Zap } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/providers";
import { localizedPhrase } from "@/lib/localize";
import type { VisaOption } from "@/lib/types";
import { formatMoney, optionLabel, optionTotal, processingLabel } from "@/lib/visa";
import { cn } from "@/lib/utils";

export function VisaOptions({
  options,
  selectedId,
  onSelect,
}: {
  options: VisaOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { locale, t, tf } = useT();
  const [expanded, setExpanded] = useState(false);
  if (options.length < 2) return null;
  const visible = expanded ? options : options.slice(0, 4);
  return (
    <section className="mb-8">
      <h2 className="font-sans text-2xl font-semibold tracking-tight text-balance text-black">
        <span className="block">{t("visa.allTypes")}</span>
        <span className="mt-2 block h-[3px] w-10 rounded-full bg-brand" />
      </h2>
      <div role="radiogroup" aria-label={t("visa.allTypes")} className="mt-5 space-y-3">
        {visible.map((option) => {
          const selected = option.id === selectedId;
          const stay = localizedPhrase(option.stay, locale, option.stayAr);
          const validity = localizedPhrase(option.validity, locale, option.validityAr);
          const entry = localizedPhrase(option.entry, locale, option.entryAr);
          return (
            <button
              key={option.id || option.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(option.id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-start transition-colors",
                selected ? "border-brand bg-[#f3f4ff] shadow-sm" : "border-line bg-white hover:border-brand/40",
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-3">
                  <span className={cn("mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-brand" : "border-[#c5cad3]")}>
                    {selected ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                  </span>
                  <span className="min-w-0 font-semibold text-black">{optionLabel(option, locale)}</span>
                </span>
                <span className="shrink-0 font-semibold text-black">{formatMoney(optionTotal(option, false), option.currency, locale)}</span>
              </span>
              <span className="mt-3 block space-y-1 ps-8 text-sm text-[#4b5563]">
                {validity ? <span className="block">{tf("visa.validFor", { value: validity })}</span> : null}
                {stay ? <span className="block">{tf("visa.maxStay", { value: stay })}</span> : null}
                {entry ? <span className="block">{tf("visa.entryLabel", { value: entry })}</span> : null}
              </span>
              <span className="mt-3 flex flex-wrap items-center gap-2 ps-8">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0fb] px-2.5 py-1 text-xs font-medium text-brand">
                  <Clock className="size-3.5" />
                  {tf("visa.visaIn", { time: processingLabel(option.processingHours, locale) })}
                </span>
                {option.expressHours != null ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff6df] px-2.5 py-1 text-xs font-medium text-[#8a6a12]">
                    <Zap className="size-3.5" />
                    {t("visa.expressAvailable")}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {options.length > 4 ? (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-3 text-sm font-medium text-brand">
          {expanded ? t("visa.viewLess") : t("visa.viewMore")}
        </button>
      ) : null}
    </section>
  );
}
