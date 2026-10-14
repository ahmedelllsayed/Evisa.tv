"use client";

import { motion } from "framer-motion";
import { Landmark, Zap } from "lucide-react";
import type { Ref } from "react";
import { WhatsAppIcon } from "@/components/brand/icons";
import { t } from "@/lib/i18n";
import { localizedPhrase } from "@/lib/localize";
import type { VisaOption } from "@/lib/types";
import { governmentFeeCharged, optionLabel, optionServiceFee } from "@/lib/visa";
import { c } from "./copy";
import { dayPart, monthPart, weekdayTime } from "./dates";
import { AnimatedMoney, FlapTiles, FlipText, Guilloche, InkStamp, MrzLines, easeOut } from "./motion";

function mrzField(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "<");
}

function mrz(code: string, name: string, option: VisaOption, hours: number, total: number) {
  const stay = option.stay?.match(/\d+/)?.[0] ?? "000";
  const entry = /multi/i.test(option.entry ?? "") ? "MULT" : "SNGL";
  const line1 = `V<${code}<${mrzField(name)}<<${mrzField(option.visaType)}`;
  const line2 = `${stay.padStart(3, "0")}D<${entry}<${String(hours).padStart(4, "0")}H<${Math.round(total)}${option.currency}`;
  return [line1, line2].map((line) => line.padEnd(36, "<").slice(0, 36));
}

export function VisaPass({
  locale,
  code,
  englishName,
  country,
  flag,
  option,
  typeName,
  express,
  due,
  hours,
  fee,
  resumeHref,
  onStart,
  ctaRef,
  whatsapp,
}: {
  locale: string;
  code: string;
  englishName: string;
  country: string;
  flag: string | null;
  option: VisaOption;
  typeName: string;
  express: boolean;
  due: Date;
  hours: number;
  fee: number;
  resumeHref: string | null;
  onStart: () => void;
  ctaRef: Ref<HTMLDivElement>;
  whatsapp: string;
}) {
  const facts = [
    { label: c(locale, "passStay"), value: localizedPhrase(option.stay, locale, option.stayAr) || "—" },
    { label: c(locale, "passValidity"), value: localizedPhrase(option.validity, locale, option.validityAr) || "—" },
    { label: c(locale, "passEntry"), value: localizedPhrase(option.entry, locale, option.entryAr) || "—" },
  ];
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.2 }}
        className="relative overflow-hidden rounded-[26px] border border-[#e3e5f2] bg-white"
      >
        <div className="relative overflow-hidden bg-[#f4f5ff] px-5 pt-5 pb-7">
          <Guilloche className="text-brand-200/80" />
          <div className="relative flex items-center gap-3">
            {flag ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flag} alt="" className="size-9 rounded-full object-cover ring-2 ring-white" />
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#6b6f8e]">{c(locale, "passType")}</p>
              <p className="truncate text-sm font-semibold text-[#16182b]">{country}</p>
            </div>
            <span className="ms-auto shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-700">
              <FlipText text={typeName} />
            </span>
          </div>
          <p className="relative mt-4 text-[22px] leading-tight font-semibold text-[#16182b]">
            <FlipText text={optionLabel(option, locale)} />
          </p>
          <dl className="relative mt-4 grid grid-cols-3 gap-2">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-[11px] text-[#6b6f8e]">{fact.label}</dt>
                <dd className="truncate text-sm font-semibold text-[#16182b]">
                  <FlipText text={fact.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative h-0" aria-hidden>
          <span className="absolute -start-3 -top-3 size-6 rounded-full border border-[#e3e5f2] bg-white" />
          <span className="absolute -end-3 -top-3 size-6 rounded-full border border-[#e3e5f2] bg-white" />
          <div className="mx-5 border-t-2 border-dashed border-[#dfe2f0]" />
        </div>

        <div className="relative px-5 pt-5 pb-5">
          <InkStamp
            stampKey={option.id || option.label}
            ring={`${mrzField(englishName).replaceAll("<", " ").trim()} ${mrzField(option.visaType).replaceAll("<", " ")}`}
            center={code}
            className="absolute end-4 -top-6 z-10 size-[100px]"
          />
          <p className="flex h-6 items-center gap-2 text-xs font-medium text-[#6b6f8e]">
            {c(locale, "passTarget")}
            {express ? (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 rounded-full bg-[#fff1bf] px-2 py-0.5 text-[11px] font-semibold text-[#6d5100]"
              >
                <Zap className="size-3 fill-current" /> {c(locale, "express")}
              </motion.span>
            ) : null}
          </p>
          <div className="mt-1.5 flex items-end gap-3">
            <FlapTiles text={dayPart(due, locale)} />
            <div className="min-w-0 pb-0.5">
              <p className="text-base font-semibold text-[#16182b]">
                <FlipText text={monthPart(due, locale)} />
              </p>
              <p className="text-xs text-muted-ink">
                <FlipText text={weekdayTime(due, locale)} />
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#4b5068]">{t(locale, "visa.gov")}</dt>
              <dd className="font-medium text-[#16182b]">
                {option.embassyVisit ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                    <Landmark className="size-3.5" /> {t(locale, "visa.govEmbassy")}
                  </span>
                ) : (
                  <AnimatedMoney value={governmentFeeCharged(option)} currency={option.currency} locale={locale} />
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#4b5068]">{t(locale, "visa.service")}</dt>
              <dd className="font-medium text-[#16182b]">
                <AnimatedMoney value={optionServiceFee(option, express)} currency={option.currency} locale={locale} />
              </dd>
            </div>
            <div className="flex items-end justify-between gap-3 border-t border-dashed border-[#dfe2f0] pt-3">
              <dt className="font-semibold text-[#16182b]">
                {t(locale, "visa.total")}
                <span className="block text-xs font-normal text-muted-ink">{c(locale, "perTraveller")}</span>
              </dt>
              <dd className="text-[26px] leading-none font-semibold text-[#16182b]">
                <AnimatedMoney value={fee} currency={option.currency} locale={locale} />
              </dd>
            </div>
          </dl>
          {option.embassyVisit ? <p className="mt-3 rounded-xl bg-[#f4f5ff] px-3 py-2 text-xs leading-relaxed text-brand-700">{c(locale, "embassyNote")}</p> : null}

          <div ref={ctaRef} className="mt-4">
            {resumeHref ? (
              <a href={resumeHref} className="flex h-12 w-full items-center justify-center rounded-full bg-brand font-semibold text-white transition-colors hover:bg-brand-600">
                {t(locale, "visa.resume")}
              </a>
            ) : (
              <motion.button
                type="button"
                onClick={onStart}
                whileTap={{ scale: 0.97 }}
                className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-brand font-semibold text-white outline-none transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
              >
                <span className="absolute inset-y-0 -start-1/3 w-1/3 -skew-x-12 bg-white/25 transition-transform duration-700 ease-out group-hover:translate-x-[420%]" />
                <span className="relative">{t(locale, "visa.start")}</span>
              </motion.button>
            )}
          </div>

          <div className="mt-4 border-t border-[#eef0f6] pt-3">
            <MrzLines lines={mrz(code, englishName, option, hours, fee)} />
          </div>
        </div>
      </motion.div>

      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-[#f6f7fb]">
          <span>
            <span className="block text-sm font-semibold text-[#282828]">{t(locale, "visa.queries")}</span>
            <span className="text-xs text-muted-ink">{t(locale, "visa.queriesBody")}</span>
          </span>
          <span className="flex size-10 items-center justify-center rounded-full border border-[#25d366] text-[#25d366]">
            <WhatsAppIcon className="size-5" />
          </span>
        </a>
      ) : null}
    </div>
  );
}
