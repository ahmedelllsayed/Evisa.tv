import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const adminInputClass = "mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm";
export const adminTextareaClass = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";
export const adminPrimaryClass = "h-10 rounded-full bg-brand px-5 text-sm font-medium text-white disabled:opacity-60";
export const adminGhostClass = "h-10 rounded-full border border-line bg-white px-4 text-sm disabled:opacity-60";
export const adminDangerClass = "h-10 rounded-full border border-red-200 bg-white px-4 text-sm text-red-700 disabled:opacity-60";

export function AdminPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-ink">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-line bg-white p-5", className)}>{children}</section>;
}

export function AdminError({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-sm text-muted-ink">{children}</p>;
}

export function MasterDetail({ list, children }: { list: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">{list}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function MasterList({ query, onQuery, placeholder, action, children }: { query: string; onQuery: (value: string) => void; placeholder: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-2">
      <div className="flex gap-2 p-1">
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm" />
        {action}
      </div>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

export function MasterRow({ active, title, meta, onClick }: { active: boolean; title: string; meta?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("block w-full rounded-xl px-3 py-2 text-start", active ? "bg-brand-50 text-brand" : "hover:bg-surface")}>
      <span className="block truncate text-sm font-medium">{title}</span>
      {meta ? <span className={cn("mt-0.5 block truncate text-xs", active ? "text-brand/70" : "text-muted-ink")}>{meta}</span> : null}
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
}) {
  return (
    <label className={cn("text-sm", className)}>
      {label}
      <input required={required} name={name} type={type} defaultValue={defaultValue} step={step} min={min} max={max} className={adminInputClass} />
    </label>
  );
}
