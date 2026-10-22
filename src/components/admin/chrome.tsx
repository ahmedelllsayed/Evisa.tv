import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const adminInputClass = "mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const adminTextareaClass = "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const adminPrimaryClass = "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50";
export const adminGhostClass = "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium disabled:opacity-50";
export const adminDangerClass = "inline-flex h-9 items-center justify-center rounded-md border border-destructive/30 bg-background px-4 text-sm font-medium text-destructive disabled:opacity-50";
export const adminThClass = "h-12 px-4 text-start align-middle text-sm font-medium text-muted-foreground";
export const adminTdClass = "p-4 align-middle text-sm";
export const adminTrClass = "border-b transition-colors last:border-0 hover:bg-muted/50";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border bg-card text-card-foreground p-6", className)}>{children}</section>;
}

export function AdminError({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">{children}</p>;
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
    <div className="rounded-lg border bg-card p-2">
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
    <button type="button" onClick={onClick} className={cn("block w-full rounded-md px-3 py-2 text-start", active ? "bg-accent font-medium text-accent-foreground" : "hover:bg-accent")}>
      <span className="block truncate text-sm">{title}</span>
      {meta ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span> : null}
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
