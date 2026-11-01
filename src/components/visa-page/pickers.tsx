"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import {
  Bed,
  BookUser,
  ChevronDown,
  CircleCheck,
  Clock,
  FileText,
  Flag,
  Image as ImageIcon,
  Landmark,
  Plane,
  Receipt,
  ShieldCheck,
  Stamp,
  Zap,
} from "lucide-react";
import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { t, tf } from "@/lib/i18n";
import { docHint, docLabel, localizedPhrase } from "@/lib/localize";
import type { VisaOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney, optionDaysSooner, optionLabel, optionTotal, processingLabel } from "@/lib/visa";
import { c } from "./copy";
import { shortDate, weekdayTime } from "./dates";
import { FlipText, easeOut } from "./motion";

export function StepHeading({ n, title, body, aside }: { n: number; title: string; body?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#16182b] text-sm font-semibold text-white tabular-nums">{n}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold tracking-tight text-[#16182b] sm:text-2xl">{title}</h2>
        {body ? <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-ink">{body}</p> : null}
      </div>
      {aside}
    </div>
  );
}

function Highlight({ id }: { id: string }) {
  return (
    <motion.span
      layoutId={id}
      className="absolute inset-0 rounded-2xl border-2 border-brand bg-brand-50/70"
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
    />
  );
}

function RadioDot({ on }: { on: boolean }) {
  return (
    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", on ? "border-brand" : "border-[#c9ccdb]")}>
      <AnimatePresence>{on ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="size-2.5 rounded-full bg-brand" /> : null}</AnimatePresence>
    </span>
  );
}

export function TypePicker({
  options,
  selectedId,
  onSelect,
  locale,
}: {
  options: VisaOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  locale: string;
}) {
  const [all, setAll] = useState(false);
  const selectedIndex = options.findIndex((item) => item.id === selectedId);
  const visible = all || options.length <= 4 ? options : options.slice(0, Math.max(4, selectedIndex + 1));
  return (
    <div>
      <div role="radiogroup" aria-label={c(locale, "stepTypes")} className="grid gap-3 sm:grid-cols-2">
        {visible.map((option) => {
          const on = option.id === selectedId;
          const facts = [
            { label: c(locale, "passStay"), value: localizedPhrase(option.stay, locale, option.stayAr) },
            { label: c(locale, "passValidity"), value: localizedPhrase(option.validity, locale, option.validityAr) },
            { label: c(locale, "passEntry"), value: localizedPhrase(option.entry, locale, option.entryAr) },
          ].filter((fact) => fact.value);
          return (
            <motion.button
              key={option.id || option.label}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(option.id)}
              whileTap={{ scale: 0.985 }}
              className={cn(
                "relative rounded-2xl border bg-white p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-300",
                on ? "border-transparent" : "border-line hover:border-brand-200",
              )}
            >
              {on ? <Highlight id="type-highlight" /> : null}
              <span className="relative flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <RadioDot on={on} />
                  <span className="font-semibold text-[#16182b]">{optionLabel(option, locale)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold text-[#16182b] tabular-nums">{formatMoney(optionTotal(option, false), option.currency, locale)}</span>
                  <span className="block text-[11px] text-muted-ink">{c(locale, "perTraveller")}</span>
                </span>
              </span>
              <span className="relative mt-3 grid grid-cols-3 gap-2 ps-7 text-xs">
                {facts.map((fact) => (
                  <span key={fact.label} className="min-w-0">
                    <span className="block text-[11px] text-[#8e93ad]">{fact.label}</span>
                    <span className="block truncate font-medium text-[#16182b]">{fact.value}</span>
                  </span>
                ))}
              </span>
              <span className="relative mt-3 flex flex-wrap gap-1.5 ps-7">
                <Chip icon={Clock}>{processingLabel(option.processingHours ?? 72, locale)}</Chip>
                {option.expressHours != null ? (
                  <Chip icon={Zap} tone="yellow">
                    {c(locale, "express")}
                  </Chip>
                ) : null}
                {option.embassyVisit ? (
                  <Chip icon={Landmark} tone="brand">
                    {t(locale, "visa.govEmbassy")}
                  </Chip>
                ) : null}
              </span>
            </motion.button>
          );
        })}
      </div>
      {options.length > visible.length ? (
        <button type="button" onClick={() => setAll(true)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          {t(locale, "visa.viewMore")} ({options.length - visible.length}) <ChevronDown className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function Chip({ icon: Icon, tone = "plain", children }: { icon: ComponentType<{ className?: string }>; tone?: "plain" | "yellow" | "brand"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "plain" && "bg-[#f1f2f7] text-[#4b5068]",
        tone === "yellow" && "bg-[#fff1bf] text-[#6d5100]",
        tone === "brand" && "bg-brand-50 text-brand-700",
      )}
    >
      <Icon className={cn("size-3", tone === "yellow" && "fill-current")} />
      {children}
    </span>
  );
}

export function SpeedPicker({
  option,
  express,
  onExpress,
  locale,
  now,
  standardDue,
  expressDue,
}: {
  option: VisaOption;
  express: boolean;
  onExpress: (express: boolean) => void;
  locale: string;
  now: Date;
  standardDue: Date;
  expressDue: Date | null;
}) {
  const sooner = optionDaysSooner(option);
  const [why, setWhy] = useState(false);
  const notes = [
    { icon: ShieldCheck, title: t(locale, "visa.noteTarget"), body: t(locale, "visa.noteTargetBody") },
    { icon: Flag, title: t(locale, "visa.noteHolidays"), body: t(locale, "visa.noteHolidaysBody") },
    { icon: Bed, title: t(locale, "visa.noteWeekends"), body: t(locale, "visa.noteWeekendsBody") },
  ];
  const standardHours = option.processingHours ?? 72;
  const ratio = express && option.expressHours ? Math.min(Math.max(0.4, option.expressHours / standardHours), 1) : 1;
  const days = Math.max(1, Math.ceil(standardHours / 24));
  return (
    <div>
      <div role="radiogroup" aria-label={c(locale, "stepSpeed")} className="grid gap-3 sm:grid-cols-2">
        <SpeedTile
          on={!express}
          onSelect={() => onExpress(false)}
          icon={ShieldCheck}
          name={c(locale, "standard")}
          due={standardDue}
          price={c(locale, "included")}
          locale={locale}
        />
        {expressDue ? (
          <SpeedTile
            on={express}
            onSelect={() => onExpress(true)}
            icon={Zap}
            name={c(locale, "express")}
            due={expressDue}
            price={c(locale, "extra", { fee: formatMoney(option.expressFee ?? 0, option.currency, locale) })}
            badge={sooner ? tf(locale, "visa.daysSooner", { days: sooner }) : null}
            locale={locale}
            accent
          />
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-sm text-muted-ink">
            <Zap className="size-4 shrink-0" /> {c(locale, "noExpress")}
          </div>
        )}
      </div>
      <RouteTrack ratio={ratio} days={days} express={express} locale={locale} now={now} due={express && expressDue ? expressDue : standardDue} />
      <button
        type="button"
        onClick={() => setWhy((open) => !open)}
        aria-expanded={why}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
      >
        {c(locale, "whyMove")} <ChevronDown className={cn("size-4 transition-transform", why && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {why ? (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="grid gap-3 overflow-hidden sm:grid-cols-3"
          >
            {notes.map((note) => (
              <li key={note.title} className="mt-3 rounded-2xl bg-[#f6f7fb] p-4">
                <note.icon className="size-4 text-brand" />
                <p className="mt-2 text-sm font-semibold text-[#16182b]">{note.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5c6570]">{note.body}</p>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SpeedTile({
  on,
  onSelect,
  icon: Icon,
  name,
  due,
  price,
  badge,
  locale,
  accent,
}: {
  on: boolean;
  onSelect: () => void;
  icon: ComponentType<{ className?: string }>;
  name: string;
  due: Date;
  price: string;
  badge?: string | null;
  locale: string;
  accent?: boolean;
}) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onSelect}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "relative rounded-2xl border bg-white p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-300",
        on ? "border-transparent" : "border-line hover:border-brand-200",
      )}
    >
      {on ? <Highlight id="speed-highlight" /> : null}
      {badge ? <span className="absolute -top-2.5 end-4 rounded-full bg-[#16182b] px-2.5 py-0.5 text-[11px] font-semibold text-white">{badge}</span> : null}
      <span className="relative flex items-center gap-2.5">
        <RadioDot on={on} />
        <span className={cn("flex size-7 items-center justify-center rounded-lg", accent ? "bg-[#ffd873] text-black" : "bg-brand text-white")}>
          <Icon className={cn("size-4", accent && "fill-current")} />
        </span>
        <span className="font-semibold text-[#16182b]">{name}</span>
        <span className={cn("ms-auto text-sm font-semibold tabular-nums", accent ? "text-[#16182b]" : "text-success")}>{price}</span>
      </span>
      <span className="relative mt-3 block ps-7">
        <span className="block text-xs text-muted-ink">{c(locale, "arrives")}</span>
        <span className="block text-[15px] font-semibold text-[#16182b]">{shortDate(due, locale)}</span>
        <span className="block text-xs text-[#4b5068]">{weekdayTime(due, locale)}</span>
      </span>
    </motion.button>
  );
}

function RouteTrack({
  ratio,
  days,
  express,
  locale,
  now,
  due,
}: {
  ratio: number;
  days: number;
  express: boolean;
  locale: string;
  now: Date;
  due: Date;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  const end = `${ratio * 100}%`;
  const travel = reduce ? { duration: 0 } : { duration: 1.3, ease: [0.65, 0, 0.35, 1] as const };
  const ticks = Array.from({ length: Math.min(Math.max(days - 1, 0), 29) }, (_, index) => ((index + 1) / days) * 100);
  return (
    <div ref={ref} className="mt-4 rounded-2xl bg-[#f6f7fb] px-6 pt-5 pb-4" dir="ltr">
      <div className="relative h-8">
        <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#dfe2ee]" />
        {ticks.map((left) => (
          <span key={left} className="absolute top-1/2 mt-2.5 h-1.5 w-px bg-[#c9ccdb]" style={{ left: `${left}%` }} />
        ))}
        <motion.span
          className="absolute start-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-brand"
          initial={{ width: "0%" }}
          animate={{ width: seen ? end : "0%" }}
          transition={travel}
        />
        <span className="absolute start-0 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-white" />
        <motion.span
          className="absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-success text-white"
          initial={{ left: "100%", scale: 0 }}
          animate={{ left: end, scale: seen ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { left: travel, scale: { delay: seen ? 1.1 : 0, type: "spring", stiffness: 500, damping: 22 } }}
        >
          <CircleCheck className="size-4" />
        </motion.span>
        <motion.span
          key={express ? "express" : "standard"}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-700"
          initial={{ left: "0%" }}
          animate={{ left: seen ? end : "0%", opacity: seen ? [1, 1, 0] : 1 }}
          transition={reduce ? { duration: 0 } : { ...travel, opacity: { duration: 1.5, times: [0, 0.8, 1] } }}
        >
          <Plane className="size-5 rotate-45 fill-current" />
        </motion.span>
      </div>
      <div className="relative mt-3 h-8 text-[11px] leading-tight text-[#5c6570]">
        <span className="absolute start-0 -translate-x-1/2 text-center">
          <span className="block font-semibold text-[#16182b]">{c(locale, "today")}</span>
          {shortDate(now, locale)}
        </span>
        <motion.span
          className="absolute top-0 whitespace-nowrap text-center"
          initial={false}
          animate={{ left: end, x: ratio === 1 ? "-85%" : "-50%" }}
          transition={travel}
        >
          <span className="block font-semibold text-success">{c(locale, "visaReady")}</span>
          <FlipText text={shortDate(due, locale)} />
        </motion.span>
      </div>
    </div>
  );
}

const docIcons: Record<string, ComponentType<{ className?: string }>> = {
  passport: BookUser,
  photo: ImageIcon,
  bank_statements: Landmark,
  income_tax_returns: Receipt,
  us_uk_schengen_visa: Stamp,
};

export function DocumentsList({ documents, locale, custom }: { documents: string[]; locale: string; custom: boolean }) {
  const count = documents.length === 1 ? c(locale, "docsCountOne") : c(locale, "docsCount", { n: documents.length });
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#fafbfd] px-4 py-3">
        <span className="text-sm font-semibold text-[#16182b]">
          <FlipText text={count} />
        </span>
        <AnimatePresence>
          {custom ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700"
            >
              {c(locale, "docsChanged")}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <ul>
        <AnimatePresence initial={false}>
          {documents.map((kind) => {
            const Icon = docIcons[kind] ?? FileText;
            const hint = docHint(kind, locale);
            return (
              <motion.li
                key={kind}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: easeOut }}
                className="overflow-hidden border-b border-[#eef0f4] last:border-b-0"
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f2fb] text-brand-600">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#16182b]">{docLabel(kind, locale)}</span>
                    {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-muted-ink">{hint}</span> : null}
                  </span>
                  <CircleCheck className="mt-1 size-4 shrink-0 text-success" />
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <p className="bg-[#fafbfd] px-4 py-3 text-xs text-muted-ink">
        {c(locale, "docsAll")} · {tf(locale, "visa.justSteps", { n: Math.max(documents.length, 1) })}
      </p>
    </div>
  );
}
