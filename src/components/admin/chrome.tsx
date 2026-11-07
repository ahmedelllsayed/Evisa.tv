import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const adminInputClass =
  "mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60";
export const adminTextareaClass =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60";
export const adminSelectClass = adminInputClass;
export const adminPrimaryClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";
export const adminGhostClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:opacity-40";
export const adminDangerClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-background px-4 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-40";
export const adminThClass = "h-11 px-4 text-start align-middle text-xs font-medium text-muted-foreground";
export const adminTdClass = "px-4 py-3 align-middle text-sm";
export const adminTrClass = "border-b border-border/70 transition-colors last:border-0 hover:bg-accent/30";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "border-border bg-muted/40 text-muted-foreground",
  info: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

const toneDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-sky-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

export function AdminPage({
  title,
  description,
  eyebrow,
  action,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="font-mono text-[11px] tracking-[0.25em] text-primary/80">{eyebrow}</p> : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border bg-card p-6 text-card-foreground", className)}>{children}</section>;
}

/** A card with a titled header row. Use `flush` for tables that should touch the card edges. */
export function AdminPanel({
  title,
  hint,
  action,
  children,
  className,
  flush,
  id,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-6 overflow-hidden rounded-xl border bg-card text-card-foreground", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </header>
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function AdminError({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">{children}</p>;
}

export function AdminNotice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cn("rounded-lg border px-4 py-2.5 text-sm", toneClass[tone])}>{children}</div>;
}

export function AdminEmpty({ title, children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed px-5 py-12 text-center">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      {children ? <div className={cn("text-sm text-muted-foreground", title && "mt-1")}>{children}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Pill({ tone = "neutral", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs", toneClass[tone], className)}>
      {dot ? <span className={cn("size-1.5 rounded-full", toneDot[tone])} /> : null}
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  note,
  tone = "neutral",
  href,
  trend,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  href?: string;
  trend?: { value: number; good?: "up" | "down" } | null;
}) {
  const good = trend ? (trend.good ?? "up") === (trend.value >= 0 ? "up" : "down") : true;
  const body = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border bg-card p-5 transition-colors",
        href && "hover:border-primary/40",
        tone !== "neutral" && "border-s-2",
        tone === "danger" && "border-s-rose-500",
        tone === "warning" && "border-s-amber-400",
        tone === "success" && "border-s-emerald-500",
        tone === "info" && "border-s-sky-400",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        {trend ? (
          <span className={cn("font-mono text-xs tabular-nums", trend.value === 0 ? "text-muted-foreground" : good ? "text-emerald-400" : "text-rose-400")}>
            {trend.value > 0 ? "▲" : trend.value < 0 ? "▼" : "•"} {Math.abs(trend.value)}%
          </span>
        ) : null}
      </div>
      {note ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
      {href ? <span className="absolute end-4 top-4 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">↗</span> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Link-based segmented control. Works in server components. */
export function Segmented({ items }: { items: { href: string; label: ReactNode; active: boolean; count?: number }[] }) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
            item.active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {item.label}
          {item.count != null ? (
            <span
              className={cn(
                "rounded px-1.5 font-mono text-[11px] tabular-nums",
                item.active ? "bg-primary-foreground/15" : item.count > 0 ? "bg-muted text-foreground" : "text-muted-foreground/60",
              )}
            >
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function PeriodSwitch({ base, days, options = [7, 30, 90] }: { base: string; days: number; options?: number[] }) {
  const join = base.includes("?") ? "&" : "?";
  return <Segmented items={options.map((value) => ({ href: `${base}${join}days=${value}`, label: `${value} يوم`, active: value === days }))} />;
}

export function MasterDetail({ list, children }: { list: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">{list}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function MasterList({
  query,
  onQuery,
  placeholder,
  action,
  filters,
  footer,
  children,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  action?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-2">
      <div className="flex gap-2 p-1">
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary"
        />
        {action}
      </div>
      {filters ? <div className="flex flex-wrap gap-1 px-1 pb-1">{filters}</div> : null}
      <div className="mt-1 space-y-0.5">{children}</div>
      {footer ? <p className="px-3 pb-1 pt-2 text-[11px] text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

export function MasterRow({
  active,
  title,
  meta,
  badge,
  onClick,
}: {
  active: boolean;
  title: string;
  meta?: string;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-start transition-colors",
        active ? "bg-accent font-medium text-accent-foreground ring-1 ring-primary/30" : "hover:bg-accent/60",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{title}</span>
        {meta ? <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{meta}</span> : null}
      </span>
      {badge ? <span className="shrink-0 pt-0.5">{badge}</span> : null}
    </button>
  );
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function AdminField({
  name,
  label,
  defaultValue,
  type = "text",
  required,
  className,
  step,
  min,
  max,
  hint,
  placeholder,
  dir,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  className?: string;
  step?: string;
  min?: string;
  max?: string;
  hint?: string;
  placeholder?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="font-medium text-foreground/90">{label}</span>
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        dir={dir}
        className={adminInputClass}
      />
      {hint ? <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Labeled({ label, hint, className, badge, children }: { label: string; hint?: ReactNode; className?: string; badge?: string; children: ReactNode }) {
  return (
    <label className={cn("block min-w-0 text-sm", className)}>
      <span className="flex items-center gap-2 font-medium text-foreground/90">
        {label}
        {badge ? <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] tracking-wider text-muted-foreground">{badge}</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 truncate">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bar({ value, max, tone = "info" }: { value: number; max: number; tone?: Tone }) {
  const share = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <span className={cn("block h-full rounded-full", toneDot[tone])} style={{ width: `${Math.round(share * 100)}%` }} />
    </span>
  );
}
