"use client";

import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import { visaHref } from "@/lib/href";
import { tf, t } from "@/lib/i18n";
import { docLabel, localizedDestinationName, localizedPhrase } from "@/lib/localize";
import type { Destination } from "@/lib/types";
import { formatDate, formatMoney, guaranteedDate, totalFee, visaTypeLabel } from "@/lib/visa";
import { cn } from "@/lib/utils";

function docsLabel(docs: string[], locale: string) {
  return docs.map((d) => docLabel(d, locale)).join(", ");
}

export function DestinationCard({ d, locale }: { d: Destination; locale: string }) {
  const due = d.processingHours != null ? guaranteedDate(d.processingHours) : null;
  const name = localizedDestinationName(d, locale);
  return (
    <Link href={visaHref(d.slug, locale)} className="group block w-full" aria-label={tf(locale, "card.apply", { name })}>
      <div className="relative aspect-[5/8] w-full cursor-pointer overflow-hidden rounded-[25px] bg-neutral-800 lg:rounded-[30px]">
        {d.image && (
          <MediaImage src={d.image} alt={d.name} fill sizes="(max-width: 1024px) 50vw, 250px" className="object-cover" />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] rounded-b-[25px] backdrop-blur-[10px] backdrop-brightness-[60%] transition-[height] duration-500 group-hover:h-[72%] lg:rounded-b-[30px]"
          style={{ maskImage: "linear-gradient(to top, black 70%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, black 70%, transparent 100%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 z-[1] flex flex-col items-center px-4 pb-4 text-white lg:px-6 lg:pb-6">
          {d.flag && (
            <span className="flex size-5 items-center justify-center overflow-hidden rounded-full lg:size-6">
              <MediaImage src={d.flag} alt="" width={24} height={24} className="size-5 object-cover lg:size-6" />
            </span>
          )}
          <p className="font-serif mt-4 text-center text-sm leading-[15px] font-medium tracking-[0.9px] uppercase lg:text-lg lg:leading-[21px]">
            {name}
          </p>
          {d.visaRequired ? (
            <>
              <div className="mt-2 flex w-full items-center justify-between border-t border-white/10 pt-3 text-[9px] leading-[14px] font-bold tracking-[1.1px] uppercase lg:mt-4 lg:pt-4 lg:text-[11px]">
                <div className="flex flex-col items-start gap-0.5 lg:gap-1">
                  <p className="opacity-45">{t(locale, "card.type")}</p>
                  <p>{visaTypeLabel(d.visaType, locale)}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 lg:items-center lg:gap-1">
                  <p className="opacity-45">{t(locale, "card.valid")}</p>
                  <p>{localizedPhrase(d.validity, locale, d.validityAr) || "—"}</p>
                </div>
                <div className="hidden flex-col items-end gap-1 lg:flex">
                  <p className="opacity-45">{t(locale, "card.fees")}</p>
                  <p>{formatMoney(totalFee(d), d.currency, locale)}</p>
                </div>
              </div>
              <div className="pointer-events-none hidden max-h-0 w-full overflow-hidden transition-all duration-500 group-hover:max-h-[260px] lg:block">
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-[9px] leading-[14px] font-bold tracking-[1.1px] uppercase opacity-45 lg:text-[11px]">{t(locale, "card.documents")}</p>
                  <p className="mt-2.5 text-start text-[10px] leading-3 font-semibold tracking-[0.24px] lg:text-xs lg:leading-4">
                    {docsLabel(d.documents, locale) || docLabel("passport", locale)}
                  </p>
                </div>
                <div className="mt-4 h-px w-full bg-white/15" />
                <div className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[30px] bg-white/10 px-[9px] py-1.5">
                  <span className="text-[12px] leading-3 font-semibold tracking-[0.02em] underline decoration-white/70 decoration-dotted underline-offset-[3px]">
                    {t(locale, "card.emergency")}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-[11px] font-bold tracking-[1.1px] uppercase">{t(locale, "card.noVisa")}</p>
          )}
        </div>
      </div>
      {d.visaRequired && due && (
        <div className="mt-3 ps-3 lg:mt-4 lg:ps-6">
          <p className="mt-3 text-xs leading-[18px] font-medium text-[#69727B] lg:text-[15px] lg:leading-6">{t(locale, "card.targetOn")}</p>
          <p className="text-xs leading-[18px] font-bold text-black lg:text-[15px] lg:leading-6">{formatDate(due, locale)}</p>
          <p className="mt-1 text-xs font-semibold text-[#69727B] lg:hidden">{t(locale, "card.fees")}: {formatMoney(totalFee(d), d.currency, locale)}</p>
        </div>
      )}
    </Link>
  );
}

export function DestinationGrid({ destinations, locale, className }: { destinations: Destination[]; locale: string; className?: string }) {
  return (
    <div className={cn("mx-auto grid w-full max-w-site grid-cols-2 justify-center gap-x-[14px] gap-y-6 px-4 pt-6 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,250px)] lg:gap-x-6 lg:gap-y-12 lg:px-6", className)}>
      {destinations.map((d) => (
        <DestinationCard key={d.id} d={d} locale={locale} />
      ))}
    </div>
  );
}
