"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Issue = { level: "error" | "warn"; message: string };
export type Issues<K extends string> = Partial<Record<K, Issue>>;

export function errorCount(issues: Partial<Record<string, Issue>>) {
  return Object.values(issues).filter((issue) => issue?.level === "error").length;
}

const inputBase =
  "mt-1.5 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60";

function tone(issue?: Issue) {
  if (!issue) return "border-input";
  return issue.level === "error" ? "border-rose-500/70" : "border-amber-400/60";
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] tracking-wider text-muted-foreground">{children}</span>;
}

export function FieldShell({
  label,
  htmlFor,
  badge,
  hint,
  issue,
  counter,
  required,
  span,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  badge?: string;
  hint?: ReactNode;
  issue?: Issue;
  counter?: { length: number; max: number; min?: number };
  required?: boolean;
  span?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const over = counter ? counter.length > counter.max : false;
  const under = counter?.min != null && counter.length > 0 && counter.length < counter.min;
  return (
    <div className={cn("min-w-0 text-sm", span && "sm:col-span-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="flex items-center gap-2 font-medium text-foreground/90">
          {label}
          {required ? <span className="text-rose-400" aria-hidden>*</span> : null}
          {badge ? <Badge>{badge}</Badge> : null}
        </label>
        {counter ? (
          <span
            className={cn(
              "font-mono text-[11px] tabular-nums",
              over ? "text-rose-400" : under ? "text-amber-300" : counter.length ? "text-emerald-400" : "text-muted-foreground",
            )}
          >
            {counter.length}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {issue ? (
        <p className={cn("mt-1.5 text-xs leading-relaxed", issue.level === "error" ? "text-rose-400" : "text-amber-300")}>{issue.message}</p>
      ) : hint ? (
        <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

type TextProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  badge?: string;
  hint?: ReactNode;
  issue?: Issue;
  counter?: { max: number; min?: number };
  dir?: "rtl" | "ltr";
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  required?: boolean;
  disabled?: boolean;
  span?: boolean;
  multiline?: boolean;
  rows?: number;
  list?: string;
  maxLength?: number;
  className?: string;
};

export function TextField({ label, value, onChange, badge, hint, issue, counter, dir, span, multiline, rows, required, className, ...rest }: TextProps) {
  const id = useId();
  const shared = {
    id,
    name: rest.name,
    value,
    dir,
    placeholder: rest.placeholder,
    disabled: rest.disabled,
    "aria-invalid": issue?.level === "error" || undefined,
    className: cn(inputBase, tone(issue), multiline ? "py-2 leading-relaxed" : "h-10", dir === "rtl" && "text-right"),
  };
  return (
    <FieldShell
      label={label}
      htmlFor={id}
      badge={badge}
      hint={hint}
      issue={issue}
      required={required}
      span={span}
      className={className}
      counter={counter ? { ...counter, length: value.length } : undefined}
    >
      {multiline ? (
        <textarea {...shared} rows={rows ?? 4} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...shared} type={rest.type ?? "text"} inputMode={rest.inputMode} list={rest.list} maxLength={rest.maxLength} onChange={(event) => onChange(event.target.value)} />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  issue,
  required,
  disabled,
  span,
  name,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: ReactNode;
  issue?: Issue;
  required?: boolean;
  disabled?: boolean;
  span?: boolean;
  name?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} issue={issue} required={required} span={span}>
      <select id={id} name={name} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={cn(inputBase, tone(issue), "h-10")}>
        {placeholder != null ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  name,
  tone: toggleTone = "info",
  disabled,
}: {
  label: string;
  description: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  name?: string;
  tone?: "info" | "success" | "warning" | "danger";
  disabled?: boolean;
}) {
  const on = {
    info: ["border-primary/40 bg-primary/[0.06]", "bg-primary"],
    success: ["border-emerald-500/40 bg-emerald-500/[0.07]", "bg-emerald-500"],
    warning: ["border-amber-400/50 bg-amber-400/[0.07]", "bg-amber-400"],
    danger: ["border-rose-500/50 bg-rose-500/[0.07]", "bg-rose-500"],
  }[toggleTone];
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-4 py-3 transition-colors",
        checked ? on[0] : "border-border hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <input type="checkbox" name={name} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
          checked ? on[1] : "bg-muted",
        )}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-[#ffffff] shadow transition-[left]", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </label>
  );
}

export function StarRating({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ["", "سيئ", "ضعيف", "مقبول", "جيد", "ممتاز"];
  return (
    <FieldShell label="التقييم" required hint={`${value} من 5 · ${words[value] ?? ""}`}>
      <div role="radiogroup" aria-label="التقييم" className="mt-1.5 flex h-10 items-center gap-1" onMouseLeave={() => setHover(0)} dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} من 5`}
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            className={cn("text-2xl leading-none transition-colors disabled:opacity-50", star <= shown ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400/60")}
          >
            ★
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("font-mono tracking-tight", className)} dir="ltr" aria-label={`${value} من 5`}>
      <span className="text-amber-400">{"★".repeat(Math.max(0, Math.min(5, value)))}</span>
      <span className="text-muted-foreground/30">{"★".repeat(Math.max(0, 5 - value))}</span>
    </span>
  );
}

/** Editor card: a titled header (with optional status) over a two-column field grid, with an optional preview column. */
export function EditorCard({
  title,
  eyebrow,
  meta,
  status,
  actions,
  aside,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id="content-editor" className="scroll-mt-4 overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b bg-gradient-to-b from-white/[0.02] to-transparent px-5 py-4 sm:px-6">
        <div className="min-w-0">
          {eyebrow ? <p className="font-mono text-[11px] tracking-[0.2em] text-primary/80">{eyebrow}</p> : null}
          <h2 data-editor-title className="mt-1 truncate text-lg font-semibold tracking-tight">{title}</h2>
          {meta ? <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{meta}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status}
          {actions}
        </div>
      </header>
      <div className={cn("grid grid-cols-1 gap-6 p-4 sm:p-6", aside && "xl:grid-cols-[minmax(0,1fr)_300px]")}>
        <div className="grid min-w-0 grid-cols-1 content-start gap-5 sm:grid-cols-2">{children}</div>
        {aside ? <div className="min-w-0 space-y-4">{aside}</div> : null}
      </div>
    </section>
  );
}

export function PreviewFrame({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">{label}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export function LangSwitch({ value, onChange }: { value: "ar" | "en"; onChange: (value: "ar" | "en") => void }) {
  return (
    <div className="flex gap-1">
      {(["ar", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={cn("rounded-md px-2 py-0.5 font-mono text-[11px]", value === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** Caps the master list height on small screens so the editor stays reachable below it. */
export function ListScroll({ children }: { children: ReactNode }) {
  return <div className="max-h-[45vh] space-y-0.5 overflow-y-auto overscroll-contain lg:max-h-none lg:overflow-visible">{children}</div>;
}

export function GroupLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <p className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-medium tracking-wide text-muted-foreground first:pt-1">
      <span>{children}</span>
      {count != null ? <span className="font-mono tabular-nums">{count}</span> : null}
    </p>
  );
}

export function ChipCount({ children, count }: { children: ReactNode; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <span className="font-mono text-[10px] tabular-nums opacity-70">{count}</span>
    </span>
  );
}
