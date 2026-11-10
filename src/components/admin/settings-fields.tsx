"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Issue = { level: "error" | "warn"; message: string };

const inputBase =
  "mt-1.5 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60";

function issueTone(issue?: Issue) {
  if (!issue) return "border-input";
  return issue.level === "error" ? "border-rose-500/70" : "border-amber-400/60";
}

export function FieldShell({
  label,
  hint,
  issue,
  counter,
  span,
  badge,
  children,
}: {
  label: string;
  hint?: ReactNode;
  issue?: Issue;
  counter?: { length: number; min?: number; max: number };
  span?: boolean;
  badge?: string;
  children: ReactNode;
}) {
  const over = counter ? counter.length > counter.max : false;
  const under = counter?.min != null && counter.length > 0 && counter.length < counter.min;
  return (
    <div className={cn("min-w-0 text-sm", span && "sm:col-span-2")}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium text-foreground/90">
          {label}
          {badge ? (
            <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] tracking-wider text-muted-foreground">{badge}</span>
          ) : null}
        </span>
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
        <p className={cn("mt-1.5 text-xs", issue.level === "error" ? "text-rose-400" : "text-amber-300")}>{issue.message}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  name,
  label,
  value,
  onChange,
  hint,
  issue,
  counter,
  span,
  dir,
  badge,
  placeholder,
  type = "text",
  inputMode,
  required,
  disabled,
  multiline,
  rows,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  issue?: Issue;
  counter?: { min?: number; max: number };
  span?: boolean;
  dir?: "rtl" | "ltr";
  badge?: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  const shared = {
    id: `f-${name}`,
    name,
    value,
    dir,
    placeholder,
    required,
    disabled,
    "aria-invalid": issue?.level === "error" || undefined,
    className: cn(inputBase, issueTone(issue), multiline ? cn("py-2 leading-relaxed", rows ? "min-h-0" : "min-h-24") : "h-10", dir === "rtl" && "text-right"),
  };
  return (
    <FieldShell label={label} hint={hint} issue={issue} counter={counter ? { ...counter, length: value.length } : undefined} span={span} badge={badge}>
      {multiline ? (
        <textarea {...shared} rows={rows} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...shared} type={type} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
      )}
    </FieldShell>
  );
}

export function Toggle({
  name,
  label,
  description,
  checked,
  onChange,
  danger,
  disabled,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-4 py-3 transition-colors",
        checked && danger ? "border-rose-500/50 bg-rose-500/[0.07]" : checked ? "border-primary/40 bg-primary/[0.06]" : "border-border hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
          checked ? (danger ? "bg-rose-500" : "bg-primary") : "bg-muted",
        )}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </label>
  );
}

export function SectionCard({
  id,
  index,
  title,
  hint,
  issues,
  aside,
  children,
}: {
  id: string;
  index: string;
  title: string;
  hint: string;
  issues: Issue[];
  aside?: ReactNode;
  children: ReactNode;
}) {
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warns = issues.length - errors;
  return (
    <section id={`settings-${id}`} data-section={id} className="scroll-mt-6 overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b bg-gradient-to-b from-white/[0.02] to-transparent px-6 py-5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.25em] text-primary/80">{index}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{hint}</p>
        </div>
        <StatusPill errors={errors} warns={warns} />
      </header>
      <div className={cn("grid grid-cols-1 gap-6 p-4 sm:p-6", aside && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="grid min-w-0 grid-cols-1 content-start gap-5 sm:grid-cols-2">{children}</div>
        {aside ? <div className="space-y-4">{aside}</div> : null}
      </div>
    </section>
  );
}

export function StatusPill({ errors, warns }: { errors: number; warns: number }) {
  if (errors) {
    return <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">{errors} يحتاج تصحيح</span>;
  }
  if (warns) {
    return <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">{warns} ملاحظة</span>;
  }
  return <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">مكتمل</span>;
}

export function PreviewFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-background/60 p-4">
      <p className="mb-3 font-mono text-[10px] tracking-[0.25em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
