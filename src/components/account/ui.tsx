"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { stageIndex, stages, statusTone, type Stage, type Tone } from "@/lib/account-insights";
import { isArabicLocale, t, type MessageKey } from "@/lib/i18n";
import type { ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function say(locale: string, en: string, ar: string) {
  return isArabicLocale(locale) ? ar : en;
}

export function fileHref(storagePath: string) {
  return `/api/files/${storagePath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

export function receiptHref(paymentId: string) {
  return `/api/account/receipts/${encodeURIComponent(paymentId)}`;
}

const statusKeys: Record<ApplicationStatus, MessageKey> = {
  draft: "status.draft",
  payment_pending: "status.payment_pending",
  submitted: "status.submitted",
  in_review: "status.in_review",
  filed: "status.filed",
  approved: "status.approved",
  rejected: "status.rejected",
  cancelled: "status.cancelled",
  refunded: "status.refunded",
};

export function statusLabel(locale: string, status: string) {
  const key = statusKeys[status as ApplicationStatus];
  return key ? t(locale, key) : status;
}

export const toneClass: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

const dotClass: Record<Tone, string> = {
  brand: "bg-brand",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  slate: "bg-slate-400",
};

export const cardClass = "min-w-0 rounded-[22px] border border-[#e3e5f2] bg-white";
export const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#e3e5f2] bg-white px-4 text-sm font-medium text-[#16182b] transition-colors hover:border-brand-200 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-50";
export const quietButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-50";
export const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-[#e3e5f2] bg-white px-3 text-sm text-[#16182b] outline-none transition-colors placeholder:text-muted-ink/70 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-surface disabled:text-muted-ink aria-invalid:border-rose-400 aria-invalid:ring-rose-100";

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn(cardClass, "p-5", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ title, hint, action, className }: { title: string; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[#16182b]">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm leading-relaxed text-muted-ink">{hint}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Pill({ tone = "slate", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", toneClass[tone], className)}>
      {dot ? <span className={cn("size-1.5 rounded-full", dotClass[tone])} /> : null}
      {children}
    </span>
  );
}

export function StatusPill({ status, locale, className }: { status: ApplicationStatus; locale: string; className?: string }) {
  return (
    <Pill tone={statusTone(status)} dot className={className}>
      {statusLabel(locale, status)}
    </Pill>
  );
}

const stageText: Record<Stage, [string, string]> = {
  details: ["Details", "البيانات"],
  payment: ["Payment", "الدفع"],
  review: ["Review", "المراجعة"],
  filing: ["Filing", "التقديم"],
  decision: ["Decision", "القرار"],
};

export function stageLabel(locale: string, stage: Stage) {
  const [en, ar] = stageText[stage];
  return say(locale, en, ar);
}

/** Five-step progress. `compact` hides the labels for list rows. */
export function StageTrack({ status, locale, compact = false, className }: { status: ApplicationStatus; locale: string; compact?: boolean; className?: string }) {
  const current = stageIndex(status);
  const tone = statusTone(status);
  const offTrack = current < 0;
  return (
    <ol className={cn("grid grid-cols-5 gap-1.5", className)} aria-label={say(locale, "Progress", "مراحل الطلب")}>
      {stages.map((stage, index) => {
        const done = !offTrack && index < current;
        const active = !offTrack && index === current;
        const finalTone = active && index === stages.length - 1 ? tone : null;
        return (
          <li key={stage} className="min-w-0" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "block h-1.5 rounded-full",
                offTrack && "bg-slate-200",
                done && "bg-brand",
                active && (finalTone === "green" ? "bg-emerald-500" : finalTone === "red" ? "bg-rose-500" : "bg-brand"),
                !offTrack && !done && !active && "bg-[#eceef6]",
              )}
            />
            {compact ? null : (
              <span
                className={cn(
                  "mt-2 block truncate text-[11px] leading-tight",
                  active ? "font-semibold text-[#16182b]" : done ? "text-body" : "text-muted-ink",
                )}
              >
                {stageLabel(locale, stage)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[22px] border border-dashed border-[#d8dbea] bg-surface/60 px-6 py-10 text-center", className)}>
      <p className="text-base font-semibold text-[#16182b]">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-ink">{body}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CopyText({ value, locale, className }: { value: string; locale: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={cn("inline-flex items-center gap-1 rounded-md font-mono text-xs text-muted-ink transition-colors hover:text-brand-700", className)}
      title={say(locale, "Copy", "نسخ")}
      dir="ltr"
    >
      {value}
      <span className="font-sans text-[10px]">{copied ? say(locale, "Copied", "نُسخ") : "⧉"}</span>
    </button>
  );
}

/** Circular progress for completeness scores. */
export function Ring({ percent, size = 56, label }: { percent: number; size?: number; label?: string }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, percent));
  const color = value >= 100 ? "#10b981" : value >= 60 ? "var(--brand-500)" : "#f59e0b";
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eceef6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length - (length * value) / 100}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-[#16182b]">{value}%</span>
    </span>
  );
}

export function Flag({ src, className }: { src: string | null; className?: string }) {
  if (!src) return <span className={cn("inline-block size-10 shrink-0 rounded-full bg-surface", className)} />;
  return <img src={src} alt="" className={cn("size-10 shrink-0 rounded-full object-cover ring-1 ring-black/5", className)} />;
}

export function BackLink({ locale, to, children }: { locale: string; to: string; children: ReactNode }) {
  return (
    <Link href={to} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
      <span aria-hidden>{isArabicLocale(locale) ? "→" : "←"}</span>
      {children}
    </Link>
  );
}

export function relativeDays(locale: string, days: number) {
  const ar = isArabicLocale(locale);
  if (days === 0) return ar ? "اليوم" : "today";
  if (days === 1) return ar ? "غداً" : "tomorrow";
  if (days === -1) return ar ? "أمس" : "yesterday";
  if (days > 0) return ar ? `بعد ${days} ${days <= 10 ? "أيام" : "يوماً"}` : `in ${days} days`;
  const n = Math.abs(days);
  return ar ? `منذ ${n} ${n <= 10 ? "أيام" : "يوماً"}` : `${n} days ago`;
}

export function relativeTime(locale: string, iso: string, now = Date.now()) {
  const ar = isArabicLocale(locale);
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return ar ? "الآن" : "just now";
  if (minutes < 60) return ar ? `منذ ${minutes} د` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return ar ? `منذ ${hours} س` : `${hours} h ago`;
  return relativeDays(locale, -Math.round(hours / 24));
}

export function bytes(size: number | null | undefined) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
