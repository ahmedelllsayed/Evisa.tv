import Link from "next/link";
import type { ReactNode } from "react";
import { href } from "@/lib/href";
import { parseProse, proseOutline, readingMinutes, type ProseBlock } from "@/lib/prose";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";

export type InfoTone = "light" | "dark";
export type Accent = "brand" | "green" | "amber" | "red" | "slate";

const accentSoft: Record<Accent, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const infoPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50";
export const infoSecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e3e5f2] bg-white px-5 text-sm font-semibold text-[#16182b] transition-colors hover:border-brand-200 hover:bg-brand-50/40";
export const infoOnDark =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ffd873] px-5 text-sm font-semibold text-black transition-colors hover:bg-[#ffcf4d]";
export const infoCardClass = "min-w-0 rounded-[22px] border border-[#e3e5f2] bg-white";

export function InfoContainer({ children, className, narrow = false }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn("mx-auto w-full min-w-0 px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-6xl", className)}>{children}</div>;
}

/** Page header shared by the information pages. `aside` renders beside the copy on wide screens. */
export function InfoHero({
  kicker,
  title,
  intro,
  actions,
  aside,
  tone = "light",
  children,
}: {
  kicker?: ReactNode;
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  tone?: InfoTone;
  children?: ReactNode;
}) {
  const dark = tone === "dark";
  const lines = title.split("\n");
  return (
    <header className={cn("relative overflow-hidden", dark ? "bg-black text-white" : "bg-linear-to-b from-[#f4f5fd] to-white")}>
      <InfoContainer className={cn("grid gap-10 pt-12 pb-10 md:pt-16 md:pb-14", aside && "lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center")}>
        <div className="min-w-0">
          {kicker ? <p className={cn("text-sm font-semibold", dark ? "text-[#ffd873]" : "text-brand-700")}>{kicker}</p> : null}
          <h1 className={cn("mt-2 text-3xl leading-tight font-semibold tracking-tight md:text-5xl", dark ? "text-white" : "text-[#16182b]")}>
            {lines.map((line, index) => (
              <span key={index} className="block">
                {line}
              </span>
            ))}
          </h1>
          <span className={cn("mt-4 block h-[3px] w-10 rounded-full", dark ? "bg-[#ffd873]" : "bg-brand")} />
          {intro ? <div className={cn("mt-5 max-w-2xl text-base leading-relaxed md:text-lg", dark ? "text-white/70" : "text-body")}>{intro}</div> : null}
          {actions ? <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div> : null}
          {children}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </InfoContainer>
    </header>
  );
}

export function InfoSection({
  id,
  title,
  hint,
  action,
  children,
  className,
  tone = "light",
}: {
  id?: string;
  title?: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: InfoTone;
}) {
  const dark = tone === "dark";
  return (
    <section id={id} className={cn("scroll-mt-24 py-10 md:py-14", className)}>
      <InfoContainer>
        {title ? (
          <div className="mb-6 flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className={cn("text-2xl font-semibold tracking-tight md:text-3xl", dark ? "text-white" : "text-[#16182b]")}>{title}</h2>
              {hint ? <p className={cn("mt-1.5 max-w-2xl text-sm leading-relaxed md:text-base", dark ? "text-white/60" : "text-muted-ink")}>{hint}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}
        {children}
      </InfoContainer>
    </section>
  );
}

export function InfoCard({ children, className, tone = "light" }: { children: ReactNode; className?: string; tone?: InfoTone }) {
  return (
    <div className={cn(tone === "dark" ? "min-w-0 rounded-[22px] border border-white/10 bg-white/[0.06]" : infoCardClass, "p-5 md:p-6", className)}>{children}</div>
  );
}

export function Badge({ accent = "slate", children, className }: { accent?: Accent; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", accentSoft[accent], className)}>{children}</span>;
}

export function StatGrid({ items, tone = "light", className }: { items: { value: ReactNode; label: ReactNode; hint?: ReactNode }[]; tone?: InfoTone; className?: string }) {
  const dark = tone === "dark";
  return (
    <dl className={cn("grid grid-cols-2 gap-3", items.length >= 4 ? "md:grid-cols-4" : items.length === 3 ? "md:grid-cols-3" : "", className)}>
      {items.map((item, index) => (
        <div key={index} className={cn("min-w-0 rounded-[18px] p-4 md:p-5", dark ? "border border-white/10 bg-white/[0.06]" : "border border-[#e3e5f2] bg-white")}>
          <dd className={cn("text-2xl font-semibold tabular-nums md:text-3xl", dark ? "text-white" : "text-[#16182b]")}>{item.value}</dd>
          <dt className={cn("mt-1 text-sm", dark ? "text-white/70" : "text-body")}>{item.label}</dt>
          {item.hint ? <p className={cn("mt-1 text-xs", dark ? "text-white/45" : "text-muted-ink")}>{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function Callout({ accent = "brand", title, children, action, className }: { accent?: Accent; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-start justify-between gap-4 rounded-[18px] px-5 py-4 ring-1 ring-inset", accentSoft[accent], className)}>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="mt-1 text-sm leading-relaxed opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Steps({ items, tone = "light" }: { items: { title: ReactNode; body?: ReactNode }[]; tone?: InfoTone }) {
  const dark = tone === "dark";
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {items.map((item, index) => (
        <li key={index} className={cn("min-w-0 rounded-[18px] p-5", dark ? "border border-white/10 bg-white/[0.06]" : "border border-[#e3e5f2] bg-white")}>
          <span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold", dark ? "bg-[#ffd873] text-black" : "bg-brand-50 text-brand-700")}>{index + 1}</span>
          <p className={cn("mt-3 font-semibold", dark ? "text-white" : "text-[#16182b]")}>{item.title}</p>
          {item.body ? <p className={cn("mt-1 text-sm leading-relaxed", dark ? "text-white/65" : "text-body")}>{item.body}</p> : null}
        </li>
      ))}
    </ol>
  );
}

/** Native disclosure list, so it works without JavaScript. */
export function FaqList({ items, tone = "light" }: { items: { q: string; a: ReactNode }[]; tone?: InfoTone }) {
  const dark = tone === "dark";
  return (
    <div className={cn("divide-y overflow-hidden rounded-[22px]", dark ? "divide-white/10 border border-white/10 bg-white/[0.04]" : "divide-[#eceef6] border border-[#e3e5f2] bg-white")}>
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden", dark ? "text-white" : "text-[#16182b]")}>
            {item.q}
            <span aria-hidden className={cn("text-lg transition-transform group-open:rotate-45", dark ? "text-white/50" : "text-muted-ink")}>
              +
            </span>
          </summary>
          <div className={cn("px-5 pb-5 text-sm leading-relaxed", dark ? "text-white/70" : "text-body")}>{item.a}</div>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ title, body, actions }: { title: string; body?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="py-10 md:py-14">
      <InfoContainer>
        <div className="flex min-w-0 flex-col gap-6 rounded-[26px] bg-[#16182b] px-6 py-8 text-white md:flex-row md:items-center md:justify-between md:px-10">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            {body ? <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">{body}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </div>
      </InfoContainer>
    </section>
  );
}

export function LinkCards({ items, tone = "light" }: { items: { to: string; title: string; body?: string; meta?: ReactNode }[]; tone?: InfoTone }) {
  const dark = tone === "dark";
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.to} className="min-w-0">
          <Link
            href={item.to}
            className={cn(
              "group flex h-full min-w-0 flex-col rounded-[18px] p-5 transition-colors",
              dark ? "border border-white/10 bg-white/[0.06] hover:bg-white/[0.1]" : "border border-[#e3e5f2] bg-white hover:border-brand-200 hover:bg-brand-50/30",
            )}
          >
            <span className={cn("font-semibold", dark ? "text-white" : "text-[#16182b]")}>{item.title}</span>
            {item.body ? <span className={cn("mt-1 text-sm leading-relaxed", dark ? "text-white/60" : "text-muted-ink")}>{item.body}</span> : null}
            {item.meta ? <span className="mt-auto pt-3 text-xs">{item.meta}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const trustPages: { path: string; en: string; ar: string }[] = [
  { path: "/on-time-guaranteed", en: "On-time date", ar: "الموعد المستهدف" },
  { path: "/transparency/refunds-policy", en: "Refunds", ar: "الاسترداد" },
  { path: "/transparency/price-change-log", en: "Fee changes", ar: "سجل الرسوم" },
  { path: "/transparency/status", en: "Service status", ar: "حالة الخدمة" },
  { path: "/security", en: "Security", ar: "الأمان" },
  { path: "/editorial-policy", en: "Editorial policy", ar: "السياسة التحريرية" },
  { path: "/privacy", en: "Privacy", ar: "الخصوصية" },
  { path: "/terms", en: "Terms", ar: "الشروط" },
];

/** Cross-links between the trust and policy pages; the current page is marked, not linked. */
export function TrustNav({ locale, current }: { locale: string; current: string }) {
  return (
    <nav aria-label={say(locale, "Trust and policies", "الثقة والسياسات")} className="border-t border-[#eceef6] bg-surface/60 py-8">
      <InfoContainer>
        <p className="text-xs font-semibold tracking-wide text-muted-ink">{say(locale, "Trust and policies", "الثقة والسياسات")}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {trustPages.map((page) => (
            <li key={page.path}>
              {page.path === current ? (
                <span aria-current="page" className="inline-flex h-9 items-center rounded-full bg-[#16182b] px-4 text-sm font-medium text-white">
                  {say(locale, page.en, page.ar)}
                </span>
              ) : (
                <Link href={href(page.path, locale)} className="inline-flex h-9 items-center rounded-full border border-[#e3e5f2] bg-white px-4 text-sm text-[#16182b] hover:border-brand-200">
                  {say(locale, page.en, page.ar)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </InfoContainer>
    </nav>
  );
}

function Blocks({ blocks }: { blocks: ProseBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "heading")
          return (
            <h2 key={index} id={block.id} className="mt-10 scroll-mt-24 text-xl font-semibold text-[#16182b] first:mt-0 md:text-2xl">
              {block.text}
            </h2>
          );
        if (block.kind === "subheading")
          return (
            <h3 key={index} className="mt-6 font-semibold text-[#16182b]">
              {block.text}
            </h3>
          );
        if (block.kind === "list")
          return (
            <ul key={index} className="mt-3 list-disc space-y-1.5 ps-5 leading-relaxed">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        return (
          <p key={index} className="mt-3 leading-[1.9]">
            {block.text}
          </p>
        );
      })}
    </>
  );
}

function arabicMinutes(n: number) {
  if (n === 1) return "دقيقة واحدة";
  if (n === 2) return "دقيقتان";
  if (n <= 10) return `${n} دقائق`;
  return `${n} دقيقة`;
}

/** Long-form policy text with an outline that follows the "## " headings. */
export function ProseArticle({ locale, body, aside }: { locale: string; body?: string; aside?: ReactNode }) {
  const blocks = parseProse(body);
  const outline = proseOutline(blocks);
  const minutes = readingMinutes(body ?? "");
  return (
    <InfoContainer className="grid gap-8 pb-14 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs text-muted-ink">{say(locale, `${minutes} min read`, `قراءة ${arabicMinutes(minutes)}`)}</p>
        {outline.length > 1 ? (
          <nav aria-label={say(locale, "On this page", "في هذه الصفحة")} className="mt-3 rounded-[18px] border border-[#e3e5f2] bg-white p-4">
            <p className="text-xs font-semibold text-muted-ink">{say(locale, "On this page", "في هذه الصفحة")}</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {outline.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="block rounded-md py-0.5 text-body hover:text-brand-700">
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {aside}
      </aside>
      <article className="min-w-0 text-[15px] text-body md:text-base">
        <Blocks blocks={blocks} />
      </article>
    </InfoContainer>
  );
}
