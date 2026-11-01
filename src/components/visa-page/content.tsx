"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import {
  Ban,
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  Route,
  ScrollText,
  Search,
  ShieldCheck,
  Stamp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { StarRow } from "@/components/brand/icons";
import { MediaImage } from "@/components/media-image";
import { href, visaHref } from "@/lib/href";
import { t, tf } from "@/lib/i18n";
import { categoryLabel, localizeFaq, localizeReview, localizedDestinationName } from "@/lib/localize";
import type { Destination, Faq, Review } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fillTemplate, initials, processingLabel } from "@/lib/visa";
import { c } from "./copy";
import { longDate } from "./dates";
import { easeOut } from "./motion";

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-xl font-semibold tracking-tight text-balance text-[#16182b] sm:text-2xl">{children}</h2>
      {aside}
    </div>
  );
}

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionTabs({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const reduce = useReducedMotion();
  const ids = items.map((item) => item.id).join(",");
  useEffect(() => {
    const list = ids.split(",");
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current = list[0] ?? "";
      for (const id of list) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);
  return (
    <nav className="sticky top-16 z-30 border-b border-line bg-white/90 backdrop-blur-md lg:top-[72px]">
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {items.map((item) => {
          const on = item.id === active;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                setActive(item.id);
                document.getElementById(item.id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
              }}
              className={cn("relative shrink-0 px-3 py-3.5 text-sm font-medium whitespace-nowrap transition-colors", on ? "text-brand-700" : "text-muted-ink hover:text-[#16182b]")}
            >
              {item.label}
              {on ? <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand" /> : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function TrustBand({ locale, approvalRate, brandName, country }: { locale: string; approvalRate: number | null; brandName: string; country: string }) {
  const promises: { icon: ComponentType<{ className?: string }>; text: string }[] = [
    { icon: ShieldCheck, text: c(locale, "promiseReview") },
    { icon: Wallet, text: c(locale, "promisePrice") },
    { icon: Route, text: c(locale, "promiseTrack") },
  ];
  return (
    <div className="overflow-hidden rounded-3xl bg-[#16182b] text-white">
      <div className={cn("grid gap-6 p-6 sm:p-7", approvalRate != null && "md:grid-cols-[minmax(0,1fr)_220px]")}>
        <ul className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
          {promises.map((promise, index) => (
            <motion.li
              key={promise.text}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: easeOut }}
              className="flex items-start gap-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#ffd873]">
                <promise.icon className="size-4" />
              </span>
              <span className="text-sm leading-relaxed font-medium text-white/90">{promise.text}</span>
            </motion.li>
          ))}
        </ul>
        {approvalRate != null ? <ApprovalRing rate={approvalRate} locale={locale} brandName={brandName} country={country} /> : null}
      </div>
    </div>
  );
}

function ApprovalRing({ rate, locale, brandName, country }: { rate: number; locale: string; brandName: string; country: string }) {
  const share = Math.min(Math.max(rate / 100, 0), 1);
  return (
    <div className="flex items-center gap-4 md:border-s md:border-white/10 md:ps-6">
      <svg viewBox="0 0 64 64" className="size-20 shrink-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
        <motion.circle
          cx="32"
          cy="32"
          r="27"
          fill="none"
          stroke="#35cc6d"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: share }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: easeOut }}
        />
      </svg>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums">{rate.toFixed(1)}%</p>
        <p className="text-xs leading-relaxed text-white/70">{c(locale, "approvedShare", { name: country })}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/50">{c(locale, "approvedNote", { brand: brandName })}</p>
      </div>
    </div>
  );
}

export function HowItWorks({ steps }: { steps: { icon: ComponentType<{ className?: string }>; label: string; title: string; body?: string; accent?: boolean }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 55%"] });
  return (
    <ol ref={ref} className="relative mt-6 space-y-3">
      <span className="absolute top-5 bottom-5 start-[19px] w-[2px] rounded-full bg-[#e6e7f2]" />
      <motion.span style={{ scaleY: scrollYProgress }} className="absolute top-5 bottom-5 start-[19px] w-[2px] origin-top rounded-full bg-brand" />
      {steps.map((step, index) => (
        <StepRow key={step.label} step={step} progress={scrollYProgress} at={steps.length > 1 ? index / (steps.length - 1) : 0} />
      ))}
    </ol>
  );
}

function StepRow({
  step,
  progress,
  at,
}: {
  step: { icon: ComponentType<{ className?: string }>; label: string; title: string; body?: string; accent?: boolean };
  progress: MotionValue<number>;
  at: number;
}) {
  const fill = useTransform(progress, [Math.max(0, at - 0.06), Math.max(0.001, at)], [0, 1]);
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: easeOut }}
      className="relative flex gap-4"
    >
      <span className="relative z-10 mt-2 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#e6e7f2] bg-white text-[#8e93ad]">
        <step.icon className="size-4" />
        <motion.span style={{ opacity: fill }} className="absolute inset-0 flex items-center justify-center bg-brand text-white">
          <step.icon className="size-4" />
        </motion.span>
      </span>
      <div className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-3.5">
        <p className="text-xs font-semibold text-brand">{step.label}</p>
        <p className={cn("font-semibold text-[#16182b]", step.accent && "text-brand-700")}>{step.title}</p>
        {step.body ? <p className="mt-0.5 text-sm leading-relaxed text-body">{step.body}</p> : null}
      </div>
    </motion.li>
  );
}

export const stepIcons = [FileText, BadgeCheck, Stamp, CalendarCheck];

export function ReviewsCarousel({ reviews, locale, country }: { reviews: Review[]; locale: string; country: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const rows = reviews.map((review) => localizeReview(review, locale));
  if (!rows.length) return null;
  const average = rows.reduce((sum, row) => sum + row.rating, 0) / rows.length;
  const move = (direction: 1 | -1) => scroller.current?.scrollBy({ left: direction * 316, behavior: "smooth" });
  return (
    <div>
      <SectionTitle
        aside={
          <span className="flex shrink-0 gap-2">
            <button type="button" aria-label={t(locale, "visa.prev")} onClick={() => move(-1)} className="flex size-10 items-center justify-center rounded-full border border-line transition-colors hover:bg-[#f6f7fb]">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" aria-label={t(locale, "visa.next")} onClick={() => move(1)} className="flex size-10 items-center justify-center rounded-full border border-line transition-colors hover:bg-[#f6f7fb]">
              <ChevronRight className="size-4" />
            </button>
          </span>
        }
      >
        {t(locale, "visa.reviews")}
      </SectionTitle>
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-ink">
        <span className="text-lg font-semibold text-[#16182b] tabular-nums">{average.toFixed(1)}</span>
        <StarRow rating={Math.round(average)} />
        <span>· {c(locale, "reviewsCount", { n: rows.length })}</span>
      </div>
      <div ref={scroller} className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none" dir="ltr">
        {rows.map((row, index) => (
          <motion.figure
            key={row.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: Math.min(index, 3) * 0.07, ease: easeOut }}
            className="flex w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-white p-5"
          >
            <StarRow rating={row.rating} />
            {row.title ? <p className="mt-3 font-semibold text-[#16182b]">{fillTemplate(row.title, country)}</p> : null}
            <blockquote className="mt-1.5 flex-1 text-sm leading-relaxed text-body">{fillTemplate(row.body, country)}</blockquote>
            <figcaption className="mt-4 flex items-center gap-2.5 border-t border-[#eef0f4] pt-4 text-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{initials(row.author)}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-[#16182b]">{row.author}</span>
                {row.location ? <span className="block truncate text-xs text-muted-ink">{row.location}</span> : null}
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
}

function rejectionIcon(title: string) {
  if (/violation|overstay/i.test(title)) return TriangleAlert;
  if (/date|time|late/i.test(title)) return Clock;
  return Ban;
}

export function Rejections({ destination, locale }: { destination: Destination; locale: string }) {
  const arabic = locale.startsWith("ar");
  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {destination.rejectionReasons.map((reason, index) => {
        const Icon = rejectionIcon(reason.title);
        return (
          <motion.li
            key={reason.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (index % 2) * 0.06, ease: easeOut }}
            className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fdecee] text-[#d4475a]">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#16182b]">{arabic && reason.titleAr ? reason.titleAr : reason.title}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-[#69727b]">{arabic && reason.bodyAr ? reason.bodyAr : reason.body}</span>
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

export function FaqSection({ faqs, locale, country }: { faqs: Faq[]; locale: string; country: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const rows = useMemo(() => faqs.map((faq) => localizeFaq(faq, locale)), [faqs, locale]);
  const categories = useMemo(() => [...new Set(rows.map((row) => row.category))], [rows]);
  const needle = query.trim().toLowerCase();
  const matches = rows.filter((row) => (!category || row.category === category) && (!needle || `${row.question} ${row.answer}`.toLowerCase().includes(needle)));
  const limited = all || needle || category ? matches : matches.slice(0, 6);
  if (!rows.length) return null;
  return (
    <div>
      <label className="mt-5 flex items-center gap-2.5 rounded-full border border-line bg-[#f7f8fa] px-4 py-3 transition-colors focus-within:border-brand-300 focus-within:bg-white">
        <Search className="size-4 text-muted-ink" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(locale, "visa.search")}
          suppressHydrationWarning
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      {categories.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory((current) => (current === item ? null : item))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === item ? "border-brand bg-brand-50 text-brand-700" : "border-line text-slate-ink hover:border-brand-200",
              )}
            >
              {categoryLabel(item, locale)}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="mt-5 overflow-hidden rounded-2xl border border-line">
        {limited.map((row) => {
          const isOpen = open === row.id;
          return (
            <li key={row.id} className="border-b border-[#eef0f4] last:border-b-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : row.id)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[#fafbfd]"
              >
                <span className="min-w-0 flex-1 font-medium text-[#16182b]">{fillTemplate(row.question, country)}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                  className={cn("flex size-7 shrink-0 items-center justify-center rounded-full transition-colors", isOpen ? "bg-brand text-white" : "bg-[#f1f2f7] text-[#16182b]")}
                >
                  <Plus className="size-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm leading-relaxed text-body">{fillTemplate(row.answer, country)}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
        {!limited.length ? <li className="px-4 py-6 text-center text-sm text-muted-ink">{c(locale, "noResults")}</li> : null}
      </ul>
      {limited.length < matches.length ? (
        <button type="button" onClick={() => setAll(true)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          {t(locale, "visa.viewMore")} ({matches.length - limited.length}) <ChevronDown className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function NearbyStrip({ nearby, locale }: { nearby: Destination[]; locale: string }) {
  return (
    <div className="mt-5 flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-none" dir="ltr">
      {nearby.map((item) => {
        const name = localizedDestinationName(item, locale);
        return (
          <Link key={item.id} href={visaHref(item.slug, locale)} className="group w-44 shrink-0 snap-start outline-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-200 ring-brand-300 ring-offset-2 group-focus-visible:ring-2">
              {item.image ? (
                <MediaImage src={item.image} alt={name} fill sizes="176px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
              ) : null}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#16182b] backdrop-blur">
                <Clock className="size-3" />
                {item.visaRequired ? processingLabel(item.processingHours ?? 72, locale) : t(locale, "card.noVisa")}
              </span>
              <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-white">
                <span className="truncate font-semibold">{name}</span>
                <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function SourcesPanel({ destination, locale, brandName }: { destination: Destination; locale: string; brandName: string }) {
  const [open, setOpen] = useState(false);
  const sources = destination.sources.filter((source) => /^https?:\/\//.test(source.url));
  return (
    <div className="rounded-2xl bg-[#f6f7fb] p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
          <ScrollText className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[#16182b]">{t(locale, "visa.reviewed")}</p>
          <p className="mt-0.5 text-sm text-muted-ink">{tf(locale, "visa.lastReviewed", { date: longDate(new Date(destination.updatedAt), locale) })}</p>
          <p className="mt-2 text-sm text-body">
            {tf(locale, "visa.sourcesBody", { brand: brandName })}{" "}
            <Link href={href("/editorial-policy", locale)} className="text-brand underline underline-offset-2">
              {t(locale, "visa.policy")}
            </Link>
            .
          </p>
        </div>
      </div>
      {sources.length ? (
        <>
          <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
            {open ? c(locale, "hideSources") : c(locale, "showSources")} · {c(locale, "sourcesCount", { n: sources.length })}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: easeOut }}
                className="overflow-hidden"
              >
                {sources.map((source) => (
                  <li key={source.url} className="mt-3 text-sm">
                    <span className="block font-medium text-[#16182b]">{source.label}</span>
                    <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-brand underline underline-offset-2">
                      {source.url}
                    </a>
                  </li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}
