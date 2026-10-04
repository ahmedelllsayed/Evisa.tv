"use client";

import { Ban, Bed, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, CreditCard, FileText, Flag, Folder, Landmark, Plus, Search, ShieldCheck, Smartphone, TriangleAlert, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StarRow, WhatsAppIcon } from "@/components/brand/icons";
import { StartApplication } from "@/components/visa/start-application";
import { documentLabels, faqCategories } from "@/data/seed/content";
import { siteConfig } from "@/config/site.config";
import { href, visaHref } from "@/lib/href";
import type { Destination, Faq, Review } from "@/lib/types";
import {
  fillTemplate,
  formatAt,
  formatMoney,
  formatOrdinalShort,
  guaranteedDate,
  initials,
  processingLabel,
  totalFee,
  visaTypeLabels,
} from "@/lib/visa";
import { cn } from "@/lib/utils";

export function VisaView({
  locale,
  destination,
  faqs,
  reviews,
  nearby,
  existingId,
  applyOpen,
  nowIso,
  approvalRate,
  approvalOverall,
  brandName,
  whatsapp,
}: {
  locale: string;
  destination: Destination;
  faqs: Faq[];
  reviews: Review[];
  nearby: Destination[];
  existingId?: string | null;
  applyOpen?: boolean;
  nowIso: string;
  approvalRate: number;
  approvalOverall: number;
  brandName: string;
  whatsapp: string;
}) {
  const [express, setExpress] = useState(false);
  const now = new Date(nowIso);
  const hours = express && destination.expressHours ? destination.expressHours : destination.processingHours ?? 72;
  const due = guaranteedDate(hours, now);
  const fee = totalFee(destination) + (express ? (destination.expressFee ?? 0) : 0);
  const country = destination.name;
  const typeName = destination.visaType === "e-visa" ? "E-Visa" : visaTypeLabels[destination.visaType];
  const daysSooner =
    destination.expressHours && destination.processingHours
      ? Math.max(1, Math.round((destination.processingHours - destination.expressHours) / 24))
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-20 lg:px-0">
      <Hero destination={destination} hours={hours} typeName={typeName} />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <InfoGrid destination={destination} typeName={typeName} />
          <GuaranteeBlock destination={destination} express={express} onExpress={setExpress} typeName={typeName} now={now} brandName={brandName} />
          {destination.visaRequired && <ApprovalBlock name={country} approvalRate={approvalRate} approvalOverall={approvalOverall} brandName={brandName} />}
          <ReviewsBlock reviews={reviews} country={country} />
          <ProcessBlock destination={destination} due={due} typeName={typeName} brandName={brandName} />
          {destination.visaRequired && <ChancesBlock typeName={typeName} approvalRate={approvalRate} brandName={brandName} />}
          <RejectionBlock destination={destination} typeName={typeName} />
          <FaqBlock faqs={faqs} country={country} />
          <NearbyBlock nearby={nearby} locale={locale} name={country} />
          <SourcesBlock destination={destination} locale={locale} brandName={brandName} />
        </div>
        <aside className="lg:sticky lg:top-24">
          <FeeCard
            destination={destination}
            locale={locale}
            express={express}
            onExpress={setExpress}
            due={due}
            fee={fee}
            daysSooner={daysSooner}
            existingId={existingId}
            applyOpen={applyOpen}
            now={now}
            whatsapp={whatsapp}
          />
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-sans text-2xl font-semibold tracking-tight text-black">
      <span className="inline-flex items-center gap-2">{children}</span>
      <span className="mt-2 block h-[3px] w-10 rounded-full bg-brand" />
    </h2>
  );
}

function Hero({ destination, hours, typeName }: { destination: Destination; hours: number; typeName: string }) {
  const [docsOpen, setDocsOpen] = useState(false);
  const demonym = siteConfig.market.demonym;
  const poster = destination.heroImage || destination.image || undefined;
  return (
    <section className="relative h-[420px] overflow-hidden rounded-[16px] bg-neutral-900 lg:h-[600px]">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={poster}
        src={destination.videoUrl || `https://media.atlys.com/b2c/clp/country-landing-page-videos/${destination.code}.mp4?tr=f-webm`}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-black/70 via-black/40 to-black/70 px-6 text-center text-white">
        <h1 className="font-sans text-4xl font-semibold lg:text-[48px] lg:leading-[56px]">
          {destination.name} Visa for {demonym}s
        </h1>
        {destination.visaRequired ? (
          <>
            <p className="inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-1.5 text-sm backdrop-blur-md">
              <ShieldCheck className="size-4" />
              {typeName} in {processingLabel(hours)}
            </p>
            <button
              type="button"
              onClick={() => setDocsOpen(true)}
              className="h-10 w-[350px] rounded-[12px] bg-brand text-base font-medium text-white shadow-md"
            >
              Check Required Documents
            </button>
          </>
        ) : (
          <p className="text-sm">No visa required</p>
        )}
      </div>
      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogTitle>Check Required Documents</DialogTitle>
          <ul className="mt-3 space-y-3">
            {destination.documents.map((kind) => (
              <li key={kind}>
                <p className="text-sm font-medium">{documentLabels[kind]?.label ?? kind}</p>
                <p className="text-xs text-muted-ink">{documentLabels[kind]?.hint}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium">That&apos;s it.</p>
          <p className="text-xs text-muted-ink">Just {Math.max(destination.documents.length, 1)} steps and we&apos;ll process your visa.</p>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InfoGrid({ destination, typeName }: { destination: Destination; typeName: string }) {
  const items = [
    { icon: Smartphone, label: "Type:", value: typeName, tint: "bg-[#eef0fb] text-brand" },
    { icon: CalendarDays, label: "Length of Stay:", value: destination.stay, tint: "bg-[#e7f6ff] text-[#1d7bbf]", line: true },
    { icon: Clock, label: "Validity:", value: destination.validity, tint: "bg-[#e8f8ee] text-[#1f9d55]", line: true, mark: "check" },
    { icon: FileText, label: "Entry:", value: destination.entry, tint: "bg-[#2f2f9a] text-white" },
    { icon: Folder, label: "Method:", value: destination.method, tint: "bg-[#eef0fb] text-brand" },
  ];
  return (
    <section>
      <SectionHeading>{typeName} Information</SectionHeading>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", item.tint)}>
              {"mark" in item && item.mark === "check" ? <Check className="size-4" /> : <item.icon className="size-4" />}
            </span>
            <div>
              <dt className="text-xs text-muted-ink">{item.label}</dt>
              <dd className={cn("text-sm font-semibold", item.line && "underline decoration-black underline-offset-4")}>{item.value ?? "—"}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function zonedYmd(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: siteConfig.market.timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function monthCells(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();
  const leading = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const daysInPrev = new Date(Date.UTC(year, month - 1, 0, 12)).getUTCDate();
  const cells: { day: number; outside: boolean; key: string }[] = [];
  for (let i = 0; i < leading; i++) {
    const day = daysInPrev - leading + 1 + i;
    cells.push({ day, outside: true, key: `prev-${day}` });
  }
  for (let day = 1; day <= daysInMonth; day++) cells.push({ day, outside: false, key: `day-${day}` });
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: next, outside: true, key: `next-${next}` });
    next += 1;
  }
  return cells;
}

function ArrivalTimeline({ due, brandName }: { due: Date; brandName: string }) {
  const arrival = zonedYmd(due);
  const cells = monthCells(arrival.year, arrival.month);
  const title = new Intl.DateTimeFormat("en-GB", {
    timeZone: siteConfig.market.timeZone,
    month: "long",
    year: "numeric",
  }).format(due);
  const notes = [
    {
      icon: CreditCard,
      tint: "bg-[#e7f0ff] text-[#3d6fd4]",
      title: `${brandName} on your Visa!`,
      body: `${brandName} works with the authorities to get your visa on time!`,
    },
    {
      icon: Flag,
      tint: "bg-[#fde8ea] text-[#e15d6c]",
      title: "Public Holidays",
      body: "We take into account public holidays observed in the country you are traveling to.",
    },
    {
      icon: Bed,
      tint: "bg-[#f8f1dc] text-[#c4a15a]",
      title: "Weekends",
      body: "Embassies are shut on Saturday & Sunday. Your visa cannot be processed then.",
    },
  ];
  return (
    <div className="mt-4 overflow-visible rounded-2xl border border-[#ececf3]">
      <div className="grid sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="px-4 pt-8 pb-4">
          <p className="text-base font-semibold text-black">{title}</p>
          <div className="mt-4 grid grid-cols-7 text-center text-[11px] text-[#9aa1ab]">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7">
            {cells.map((cell) => {
              const selected = !cell.outside && cell.day === arrival.day;
              return (
                <span key={cell.key} className="relative flex h-10 items-center justify-center">
                  {selected && (
                    <span className="absolute bottom-[calc(100%-4px)] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[10px] font-semibold tracking-wide text-[#5b63e6] shadow-[0_4px_16px_rgba(17,24,39,0.12)]">
                      <Clock className="size-3" /> VISA ARRIVAL
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-white" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg text-sm",
                      cell.outside && "text-[#c5cad3]",
                      selected && "bg-brand font-semibold text-white",
                    )}
                  >
                    {cell.day}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <aside className="border-t border-[#ececf3] bg-[#f6f7fb] px-4 py-5 sm:border-t-0 sm:border-l">
          <p className="border-b border-dashed border-[#e1e3ea] pb-3 text-[11px] font-semibold tracking-[0.14em] text-[#8b919a]">GOOD TO KNOW</p>
          <ul className="mt-4 space-y-5">
            {notes.map((note) => (
              <li key={note.title} className="flex gap-3">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", note.tint)}>
                  <note.icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-black">{note.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[#5c6570]">{note.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function DateChoice({
  due,
  selected,
  onSelect,
  icon,
  sooner,
  brandName,
}: {
  due: Date;
  selected: boolean;
  onSelect: () => void;
  icon: "shield" | "bolt";
  sooner?: number | null;
  brandName: string;
}) {
  const [timeline, setTimeline] = useState(false);
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 pt-6 pl-4",
        selected ? "z-[2] border-brand/40 bg-white shadow-xl" : "mt-6 border-transparent bg-[#f8fafc]",
      )}
    >
      {sooner ? (
        <p
          className={cn(
            "absolute top-0 left-4 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-medium",
            selected ? "bg-[#2026A6] text-white" : "bg-[#EFF0FF] text-brand",
          )}
        >
          {sooner} days sooner
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 pl-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            {icon === "shield" ? (
              <span className="flex size-7 items-center justify-center rounded-md bg-brand text-white">
                <ShieldCheck className="size-4" />
              </span>
            ) : (
              <Zap className="size-4 fill-black text-black" />
            )}
            {formatAt(due)}
          </p>
          <button type="button" onClick={() => setTimeline((v) => !v)} className="mt-1 ml-9 inline-flex items-center gap-1 text-xs text-[#6b7cff]">
            <Clock className="size-3.5" /> View Timeline <ChevronDown className={cn("size-3", timeline && "rotate-180")} />
          </button>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex h-8 w-28 items-center justify-center gap-1.5 rounded-lg text-sm font-medium",
            selected ? "bg-brand text-white" : "border border-line bg-white text-slate-ink",
          )}
        >
          {selected && <Check className="size-3.5" />}
          {selected ? "Selected" : "Select"}
        </button>
      </div>
      {timeline && <ArrivalTimeline due={due} brandName={brandName} />}
    </div>
  );
}

function GuaranteeBlock({
  destination,
  express,
  onExpress,
  typeName,
  now,
  brandName,
}: {
  destination: Destination;
  express: boolean;
  onExpress: (v: boolean) => void;
  typeName: string;
  now: Date;
  brandName: string;
}) {
  if (!destination.visaRequired) return null;
  const standardDue = guaranteedDate(destination.processingHours ?? 72, now);
  const expressDue = destination.expressHours ? guaranteedDate(destination.expressHours, now) : null;
  const daysSooner =
    destination.expressHours && destination.processingHours
      ? Math.max(1, Math.round((destination.processingHours - destination.expressHours) / 24))
      : null;
  return (
    <section className="relative mt-10 pl-6">
      <span className="absolute top-2.5 left-0 size-2.5 rounded-full bg-brand" />
      <span className="absolute top-6 bottom-0 left-[4px] w-px bg-[#e6e6f2]" />
      <SectionHeading>Get a Guaranteed {typeName} on</SectionHeading>
      <div className="mt-5">
        <DateChoice due={standardDue} selected={!express} onSelect={() => onExpress(false)} icon="shield" brandName={brandName} />
        {expressDue && daysSooner && (
          <DateChoice due={expressDue} selected={express} onSelect={() => onExpress(true)} icon="bolt" sooner={daysSooner} brandName={brandName} />
        )}
      </div>
    </section>
  );
}

function formatRate(value: number) {
  return `${Number(value).toFixed(1)}%`;
}

function ApprovalBlock({ name, approvalRate, approvalOverall, brandName }: { name: string; approvalRate: number; approvalOverall: number; brandName: string }) {
  const rows = [
    ["Documents", "Consistent and Upto date", "Often vague and mismatched"],
    ["Itinerary", "Accurate", "Unclear and not verifiable"],
    ["Checks", "AI + Human reviewed", "Manual process - Prone to error"],
  ];
  return (
    <section className="relative mt-12">
      <div className="pointer-events-none absolute -top-1 right-0 z-10 w-[92px]">
        <img src="/brand/clp/ribbon.svg" alt="" className="h-auto w-full" />
        <p className="absolute inset-x-2 top-3 text-center text-[11px] leading-[1.15] font-bold">
          <span className="block text-[#3dff8a]">Higher</span>
          <span className="mt-0.5 block text-[10px] font-semibold text-white">approval chances</span>
        </p>
      </div>
      <div className="pr-24">
        <h2 className="flex items-center gap-2 font-sans text-[26px] leading-tight font-semibold text-black">
          <img src="/brand/clp/guarantee.svg" alt="" className="size-6" />
          Your Approval is Guaranteed on {brandName}
        </h2>
        <span className="mt-2 block h-[3px] w-10 rounded-full bg-brand" />
      </div>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#4b5563]">
        Applying for a {name} visa is tedious and often gets rejected due to manual errors in most cases. {brandName} however combines a manual expert review with AI review to ensure <span className="font-extrabold text-black">ZERO</span> mistakes.
      </p>
      <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e7e9ee] bg-white shadow-[0_8px_28px_rgba(16,24,40,0.06)]">
        <div className="relative grid grid-cols-2 gap-4 px-4 pt-4 pb-2">
          <div className="rounded-[18px] border border-[#b7ebc6] bg-[#f3fbf6] px-4 py-7 text-center">
            <img src="/brand/clp/check.svg" alt="" className="mx-auto size-7" />
            <p className="mt-3 text-[40px] leading-none font-extrabold tracking-tight text-black">{formatRate(approvalRate)}</p>
            <p className="mt-3 text-[11px] font-bold tracking-[0.04em] text-[#12B76A] uppercase">Approval on {brandName}</p>
          </div>
          <div className="rounded-[18px] border border-[#f3c3c3] bg-[#fdf4f4] px-4 py-7 text-center">
            <img src="/brand/clp/warning.svg" alt="" className="mx-auto size-7" />
            <p className="mt-3 text-[40px] leading-none font-extrabold tracking-tight text-black">{formatRate(approvalOverall)}</p>
            <p className="mt-3 text-[11px] font-bold tracking-[0.04em] text-[#E93E33] uppercase">Approval overall</p>
          </div>
          <span className="absolute top-[46%] left-1/2 z-10 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white shadow-sm">
            VS
          </span>
        </div>
        {rows.map(([label, good, bad]) => (
          <div key={label} className="grid grid-cols-[92px_1fr_1.15fr] items-center gap-3 border-t border-[#eceff3] px-5 py-3.5 text-sm">
            <span className="font-bold text-black">{label}</span>
            <span className={cn("inline-flex items-center justify-end gap-1.5 text-right text-black", label === "Checks" && "font-bold")}>
              {good} <img src="/brand/clp/check.svg" alt="" className="size-4 shrink-0" />
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#667085]">
              {bad} <img src="/brand/clp/warning.svg" alt="" className="size-4 shrink-0" />
            </span>
          </div>
        ))}
        <p className="flex items-center justify-center gap-2 bg-[linear-gradient(90deg,#c9eed8_0%,#f4fbf7_42%,#d7f3e3_100%)] px-4 py-3.5 text-center text-sm font-semibold text-black">
          <img src="/brand/clp/check.svg" alt="" className="size-4" />
          Your approval is guaranteed, or your visa fees back!
        </p>
      </div>
    </section>
  );
}

function FeeCard({
  destination,
  locale,
  express,
  onExpress,
  due,
  fee,
  daysSooner,
  existingId,
  applyOpen,
  now,
  whatsapp,
}: {
  destination: Destination;
  locale: string;
  express: boolean;
  onExpress: (express: boolean) => void;
  due: Date;
  fee: number;
  daysSooner: number | null;
  existingId?: string | null;
  applyOpen?: boolean;
  now: Date;
  whatsapp: string;
}) {
  if (!destination.visaRequired) return null;
  const standardDue = guaranteedDate(destination.processingHours ?? 72, now);
  const otherDay = formatOrdinalShort(standardDue).split(",")[0];
  return (
    <div className="select-none">
      <div className="relative z-[1] -mb-2 flex items-end pb-2">
        {express && (
          <button
            type="button"
            onClick={() => onExpress(false)}
            className="relative mb-1 mr-1 flex h-9 items-center gap-1 rounded-t-2xl px-2 text-xs font-semibold text-[#2026A6]"
          >
            <Clock className="size-3.5" />
            {otherDay}
          </button>
        )}
        <div className="relative flex h-11 items-center gap-1.5 rounded-t-3xl bg-[#e6e8f0] px-3.5 pr-5 text-xs font-semibold text-[#2026A6]">
          <span className="pointer-events-none absolute top-0 -right-2 block h-full w-5 skew-x-[27deg] rounded-tr-2xl bg-[#e6e8f0]" />
          {express ? <Zap className="relative size-3.5 fill-[#2026A6] text-[#2026A6]" /> : <ShieldCheck className="relative size-4" />}
          <span className="relative">Guaranteed by {formatOrdinalShort(due)}</span>
        </div>
        {!express && daysSooner && (
          <button
            type="button"
            onClick={() => onExpress(true)}
            className="relative ml-3 flex h-11 items-center gap-1.5 px-2 text-xs font-semibold text-black"
          >
            <Zap className="size-3.5 fill-black" />
            {daysSooner} days faster
          </button>
        )}
      </div>
      <div className={cn("relative rounded-[1.75rem] bg-[#e6e8f0] p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]", !express && "rounded-tl-none")}>
        <div className="rounded-3xl border border-gray-300 bg-white p-5">
          <dl className="text-sm">
            <div className="flex items-center justify-between gap-2 border-b border-line py-3">
              <dt className="flex items-center gap-2 font-semibold"><Landmark className="size-4" /> Government Fees</dt>
              <dd className="font-semibold">{formatMoney(destination.govFee, destination.currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-line py-3">
              <dt className="flex items-center gap-2 font-semibold"><Zap className="size-4 text-brand" /> Processing Fees</dt>
              <dd className="font-semibold">{formatMoney(destination.serviceFee + (express ? (destination.expressFee ?? 0) : 0), destination.currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 py-3 font-semibold">
              <dt className="flex items-center gap-2"><CreditCard className="size-4" /> Total Amount</dt>
              <dd>{formatMoney(fee, destination.currency)}</dd>
            </div>
          </dl>
          <div className="mt-2">
            <StartApplication destination={destination} locale={locale} express={express} existingId={existingId} defaultOpen={applyOpen} now={now} />
          </div>
        </div>
      </div>
      {whatsapp ? (
      <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between px-1">
        <span>
          <span className="block text-sm font-semibold text-[#282828]">Have Queries?</span>
          <span className="text-xs text-muted-ink">Documents, process, price, etc.</span>
        </span>
        <span className="flex size-9 items-center justify-center rounded-full border border-[#25d366] text-[#25d366]">
          <WhatsAppIcon className="size-5" />
        </span>
      </a>
      ) : null}
    </div>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 28 36" className={cn("h-9 w-7 text-neutral-700", flip && "-scale-x-100")} aria-hidden>
      <path fill="currentColor" d="M14 34c.2-6 1.2-10 4-14-3 1-6 0-8-2 2 4 2.4 8 2 12-3-2-6-2-8 0 2-1 4-1 6 0-2 2-3 4-4 4zm0 0c-.2-6-1.2-10-4-14 3 1 6 0 8-2-2 4-2.4 8-2 12 3-2 6-2 8 0-2-1-4-1-6 0 2 2 3 4 4 4z" />
    </svg>
  );
}

function ReviewsBlock({ reviews, country }: { reviews: Review[]; country: string }) {
  const [i, setI] = useState(0);
  if (!reviews.length) return null;
  const slice = reviews.slice(i, i + 3);
  return (
    <section className="mt-12">
      <SectionHeading>Reviews</SectionHeading>
      <div className="mt-8 text-center">
        <p className="flex items-center justify-center gap-3 font-sans text-3xl font-medium">
          <Laurel /> Top rated across all platforms <Laurel flip />
        </p>
        <p className="mt-2 text-sm text-muted-ink">Trusted by thousands of travellers in the {siteConfig.market.countryName}</p>
        <div className="mt-3 flex items-center justify-center gap-3 text-sm text-slate-ink">
          <span className="font-medium text-[#00b67a]">★ Trustpilot</span>
          <span className="text-line">|</span>
          <span> App Store</span>
          <span className="text-line">|</span>
          <span>Google Play</span>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {slice.map((r) => (
          <figure key={r.id} className="rounded-2xl border border-line p-4">
            <figcaption className="flex items-center gap-2 text-sm">
              <span className="flex size-10 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold">
                {initials(r.author)}
              </span>
              <span>
                {r.author}
                <span className="block text-xs text-muted-ink">{r.location}</span>
              </span>
            </figcaption>
            <div className="mt-3">
              <StarRow rating={r.rating} />
            </div>
            <p className="mt-2 text-sm font-medium">{fillTemplate(r.title ?? "", country)}</p>
            <blockquote className="mt-1 text-sm leading-relaxed text-body">{fillTemplate(r.body, country)}</blockquote>
          </figure>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <button type="button" aria-label="Previous" onClick={() => setI((n) => Math.max(0, n - 1))} className="flex size-9 items-center justify-center rounded-full border border-line">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" aria-label="Next" onClick={() => setI((n) => Math.min(Math.max(0, reviews.length - 3), n + 1))} className="flex size-9 items-center justify-center rounded-full border border-line">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  );
}

function stepWhen(due: Date) {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: siteConfig.market.timeZone, day: "2-digit", month: "short" }).format(due);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: siteConfig.market.timeZone, hour: "2-digit", minute: "2-digit", hour12: true }).format(due);
  return `${day}, ${time}`;
}

function ProcessBlock({ destination, due, typeName, brandName }: { destination: Destination; due: Date; typeName: string; brandName: string }) {
  const steps = [
    { n: 1, title: `Apply on ${brandName}`, body: `Submit your documents on ${brandName} — only pay government fee.` },
    { n: 2, title: "Your Documents Are Verified", body: `${brandName} verifies your documents and submits to Immigration` },
    { n: 3, title: `Your ${typeName} Gets Processed`, body: `We work with Immigration to ensure you get your ${typeName} on time.` },
    { n: 4, title: `Get Your ${typeName} on ${stepWhen(due)}`, body: "" },
  ];
  return (
    <section className="mt-12">
      <SectionHeading>How {typeName} Process Works</SectionHeading>
      <ol className="relative mt-6 space-y-4 pl-6">
        <span className="absolute top-3 bottom-3 left-[5px] w-px bg-[#d9d6f5]" />
        {steps.map((s) => (
          <li key={s.n} className="relative">
            <span className="absolute top-5 -left-[22px] size-2.5 rounded-full bg-brand" />
            <div className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-sm font-medium text-brand">Step {s.n}</p>
              <p className={cn("font-semibold", s.n === 4 && "text-brand")}>{s.title}</p>
              {s.body && <p className="text-sm text-body">{s.body}</p>}
              {s.n === 3 && (
                <ul className="mt-3 space-y-3 rounded-xl border border-line border-l-2 border-l-brand px-3 py-3 text-sm">
                  {["Application has been sent to the immigration supervisor", "Application has been sent to internal intelligence"].map((t) => (
                    <li key={t} className="list-disc ml-4">
                      <p>{t}</p>
                      <p className="text-xs text-muted-ink">
                        8 Jan, 5:45 AM <span className="ml-1 rounded-full bg-[#35cc6d] px-1.5 py-0.5 text-[10px] font-semibold text-white">ON TIME</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function productLabel(typeName: string) {
  return typeName.replace(/e-visa/i, "E-visa");
}

function ApprovalGauge() {
  const ticks = Array.from({ length: 28 }, (_, index) => {
    const deg = 206 - (232 * index) / 27;
    const rad = (deg * Math.PI) / 180;
    const inner = 26;
    const outer = index % 2 === 0 ? 34 : 31;
    const x1 = (46 + inner * Math.cos(rad)).toFixed(2);
    const y1 = (44 - inner * Math.sin(rad)).toFixed(2);
    const x2 = (46 + outer * Math.cos(rad)).toFixed(2);
    const y2 = (44 - outer * Math.sin(rad)).toFixed(2);
    const hot = index < 8;
    return (
      <line
        key={index}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={hot ? "#5057ea" : "#d5d8e6"}
        strokeWidth={index % 2 === 0 ? 2.2 : 1.4}
        strokeLinecap="round"
      />
    );
  });
  return (
    <div className="flex w-[108px] shrink-0 flex-col items-center">
      <svg viewBox="0 0 92 78" className="h-[78px] w-[108px]" aria-hidden>
        {ticks}
        <text x="46" y="50" textAnchor="middle" fill="#111" fontSize="15" fontWeight="700">
          100%
        </text>
      </svg>
      <span className="-mt-2 rounded-full bg-[#e4e7fb] px-3 py-1 text-[11px] font-medium text-[#5057ea]">Takes 5 seconds</span>
    </div>
  );
}

function ChancesBlock({ typeName, approvalRate, brandName }: { typeName: string; approvalRate: number; brandName: string }) {
  const [open, setOpen] = useState(false);
  const product = productLabel(typeName);
  return (
    <section className="mt-12">
      <SectionHeading>Want to know if your {product} will be approved?</SectionHeading>
      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-[#f4f5fb] px-6 py-5">
        <div>
          <p className="text-[15px] leading-tight text-black">Learn Your</p>
          <p className="text-lg leading-tight font-bold text-black">Chances of Approval</p>
          <p className="mt-1 text-sm text-[#8b919a]">Answer 6 questions to know your chances</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-medium text-brand">
            Evaluate my chances <span aria-hidden>›</span>
          </button>
        </div>
        <ApprovalGauge />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogTitle>Chances of approval</DialogTitle>
          <p className="text-sm text-body">
            A complete passport, a clear photo and matching travel dates are the checks that decide a {typeName}. With those in place, approval on {brandName} is {formatRate(approvalRate)}.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BarsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M7 4.5v15M12 4.5v15M17 4.5v15" strokeLinecap="round" />
    </svg>
  );
}

function rejectionIcon(title: string) {
  if (/passport/i.test(title)) return Ban;
  if (/criminal/i.test(title)) return BarsIcon;
  if (/violation|overstay/i.test(title)) return TriangleAlert;
  return Ban;
}

function RejectionBlock({ destination, typeName }: { destination: Destination; typeName: string }) {
  const product = productLabel(typeName);
  const reasons = (destination.rejectionReasons.length
    ? destination.rejectionReasons
    : [
        { title: "Expired Passport", body: "Applying with a passport that has expired or expires within 6 months" },
        { title: "Criminal Record", body: "Having a criminal history that disqualifies you from obtaining a visa." },
        { title: "Previous Visa Violations", body: "Having overstayed or violated the terms of a previous visa." },
      ]
  ).map((reason) => ({
    ...reason,
    title: /previous/i.test(reason.title) && /violation/i.test(reason.title) ? `Previous ${product} Violations` : reason.title,
  }));
  return (
    <section className="mt-12">
      <SectionHeading>
        {destination.name} {product} Rejection Reasons
      </SectionHeading>
      <p className="mt-4 text-sm text-black">Factors that can get your {product} rejected</p>
      <ul className="mt-2 divide-y divide-[#ececf1]">
        {reasons.map((reason) => {
          const Icon = rejectionIcon(reason.title);
          return (
            <li key={reason.title} className="flex items-start gap-3 py-4">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#d7dbe3] text-[#5c6570]">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-black">{reason.title}</p>
                <p className="text-sm text-[#69727b]">{reason.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FaqBlock({ faqs, country }: { faqs: Faq[]; country: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const cats = useMemo(() => faqCategories.filter((c) => faqs.some((f) => f.category === c)), [faqs]);
  const visible = cat ? cats.filter((c) => c === cat) : cats;
  return (
    <section className="mt-12">
      <SectionHeading>Frequently Asked Questions</SectionHeading>
      <label className="mt-4 flex items-center gap-2 rounded-full border border-line bg-[#f7f7f8] px-4 py-2.5">
        <Search className="size-4 text-muted-ink" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Smart AI; Ask me anything..."
          suppressHydrationWarning
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat((current) => (current === c ? null : c))}
            className={cn("rounded-full border px-3 py-1.5 text-xs", cat === c ? "border-brand bg-brand-50 text-brand" : "border-line text-slate-ink")}
          >
            {c}
          </button>
        ))}
      </div>
      <Accordion className="mt-6">
        {visible.map((c) => {
          const items = faqs.filter((f) => {
            if (f.category !== c) return false;
            if (!q.trim()) return true;
            return `${f.question} ${f.answer}`.toLowerCase().includes(q.toLowerCase());
          });
          if (!items.length) return null;
          return (
            <AccordionItem key={c} value={c}>
              <AccordionTrigger className="text-base font-medium text-brand [&_svg]:hidden">
                {c}
                <Plus className="size-4 text-black" />
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pb-2">
                  {items.map((f) => (
                    <li key={f.id}>
                      <p className="font-medium">{fillTemplate(f.question, country)}</p>
                      <p className="text-body">{fillTemplate(f.answer, country)}</p>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}

function NearbyBlock({ nearby, locale, name }: { nearby: Destination[]; locale: string; name: string }) {
  if (!nearby.length) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold">Nearby countries to {name}</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {nearby.map((d) => (
          <Link key={d.id} href={visaHref(d.slug, locale)} className="w-40 shrink-0">
            <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-neutral-200">
              {d.image && <Image src={d.image} alt={d.name} fill className="object-cover" sizes="160px" />}
            </div>
            <p className="mt-2 text-sm font-medium">{d.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SourcesBlock({ destination, locale, brandName }: { destination: Destination; locale: string; brandName: string }) {
  const [tab, setTab] = useState<"sources" | "history">("sources");
  const sources = destination.sources.filter((source) => /^https?:\/\//.test(source.url));
  return (
    <section className="mt-12">
      <h2 className="font-sans text-2xl font-semibold tracking-tight text-black">
        How We Reviewed This Page
        <span className="mt-2 block h-[3px] w-10 rounded-full bg-brand" />
      </h2>
      <div className="mt-5 flex gap-6 border-b border-[#ececf1] text-sm font-semibold tracking-wide">
        <button type="button" onClick={() => setTab("sources")} className={cn("inline-flex items-center gap-2 border-b-2 pb-2", tab === "sources" ? "border-brand text-brand" : "border-transparent text-muted-ink")}>
          <FileText className="size-4" /> SOURCES
        </button>
        <button type="button" onClick={() => setTab("history")} className={cn("inline-flex items-center gap-2 border-b-2 pb-2", tab === "history" ? "border-brand text-brand" : "border-transparent text-muted-ink")}>
          <Clock className="size-4" /> HISTORY
        </button>
      </div>
      {tab === "sources" ? (
        <div className="mt-5 text-sm leading-relaxed text-black">
          <p>
            {brandName} has strict sourcing guidelines and relies on official government websites. We avoid using tertiary references. You can learn more about how we ensure our content is accurate and current by reading our{" "}
            <Link href={href("/editorial-policy", locale)} className="text-brand underline">
              editorial policy
            </Link>
            .
          </p>
          <ul className="mt-4 space-y-3">
            {sources.map((source) => (
              <li key={source.url} className="flex gap-2">
                <span className="mt-1 text-[10px] text-brand">▶</span>
                <span>
                  {source.label}. (Web).{" "}
                  <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-brand underline">
                    {source.url}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 text-sm text-body">
          Last reviewed {new Date(destination.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} against the official pages listed under Sources.
        </p>
      )}
    </section>
  );
}
