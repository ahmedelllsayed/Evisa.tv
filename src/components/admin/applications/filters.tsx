"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

export type FilterValues = {
  q: string;
  status: string;
  destination: string;
  option: string;
  assignee: string;
  paid: string;
  timing: string;
  from: string;
  to: string;
  view: string;
};

type Option = { value: string; label: string };

const selectClass = cn(adminInputClass, "mt-0 h-9 min-w-0 cursor-pointer pe-8 text-[13px]");

function shiftDay(day: string, delta: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function ApplicationFilters({
  locale,
  values,
  statuses,
  destinations,
  options,
  staff,
  today,
}: {
  locale: string;
  values: FilterValues;
  statuses: (Option & { count: number })[];
  destinations: Option[];
  options: { destination: string; name: string; items: (Option & { count?: number })[] }[];
  staff: Option[];
  today: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [more, setMore] = useState(Boolean(values.from || values.to));
  const [destination, setDestination] = useState(values.destination);

  const apply = (patch: Partial<FilterValues> = {}) => {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const next = new URLSearchParams();
    const keys: (keyof FilterValues)[] = ["q", "status", "destination", "option", "assignee", "paid", "timing", "from", "to"];
    for (const key of keys) {
      const value = key in patch ? patch[key] : String(data.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    if (values.view) next.set("view", values.view);
    const query = next.toString();
    start(() => router.push(href(`/admin/applications${query ? `?${query}` : ""}`, locale)));
  };

  const visibleGroups = destination ? options.filter((group) => group.destination === destination) : options;
  const presets = [
    { label: "اليوم", from: today, to: today },
    { label: "آخر 7 أيام", from: shiftDay(today, -6), to: today },
    { label: "آخر 30 يوماً", from: shiftDay(today, -29), to: today },
    { label: "هذا الشهر", from: `${today.slice(0, 8)}01`, to: today },
  ];

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className={cn("rounded-xl border bg-card p-3 transition-opacity", pending && "opacity-70")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-[1_1_280px]">
          <svg viewBox="0 0 20 20" aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 fill-none stroke-muted-foreground" strokeWidth="1.8">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3 3" strokeLinecap="round" />
          </svg>
          <input
            name="q"
            defaultValue={values.q}
            placeholder="رقم الطلب أو بريد العميل أو الدولة"
            className={cn(adminInputClass, "mt-0 h-9 ps-9")}
            type="search"
          />
        </div>
        <button className={cn(adminPrimaryClass, "px-5")} disabled={pending}>
          {pending ? "جارٍ البحث…" : "بحث"}
        </button>
        <button
          type="button"
          onClick={() => setMore((value) => !value)}
          aria-expanded={more}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
            more || values.from || values.to ? "border-primary/40 text-foreground" : "border-input text-muted-foreground hover:text-foreground",
          )}
        >
          فلاتر أكثر
          {values.from || values.to ? <span className="size-1.5 rounded-full bg-primary" /> : null}
          <svg viewBox="0 0 12 12" aria-hidden className={cn("size-3 fill-none stroke-current transition-transform", more && "rotate-180")} strokeWidth="1.6">
            <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <select name="status" defaultValue={values.status} onChange={() => apply()} className={selectClass} aria-label="الحالة">
          <option value="">كل الحالات</option>
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label} ({item.count})
            </option>
          ))}
        </select>
        <select
          name="destination"
          defaultValue={values.destination}
          onChange={(event) => {
            setDestination(event.target.value);
            const option = formRef.current?.elements.namedItem("option") as HTMLSelectElement | null;
            const keep = options.some((group) => group.destination === event.target.value && group.items.some((item) => item.value === option?.value));
            apply(keep ? {} : { option: "" });
          }}
          className={selectClass}
          aria-label="الوجهة"
        >
          <option value="">كل الوجهات</option>
          {destinations.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select name="option" defaultValue={values.option} onChange={() => apply()} className={selectClass} aria-label="نوع التأشيرة">
          <option value="">كل أنواع التأشيرة</option>
          {visibleGroups.map((group) => (
            <optgroup key={group.destination} label={group.name}>
              {group.items.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                  {item.count != null ? ` (${item.count})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select name="assignee" defaultValue={values.assignee} onChange={() => apply()} className={selectClass} aria-label="المسؤول">
          <option value="">كل المسؤولين</option>
          {staff.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select name="paid" defaultValue={values.paid} onChange={() => apply()} className={selectClass} aria-label="الدفع">
          <option value="">مدفوع وغير مدفوع</option>
          <option value="paid">مدفوع</option>
          <option value="unpaid">غير مدفوع</option>
        </select>
        <select name="timing" defaultValue={values.timing} onChange={() => apply()} className={selectClass} aria-label="التوقيت">
          <option value="">كل المواعيد</option>
          <option value="late">متأخر عن الموعد</option>
        </select>
      </div>

      <div className={cn("mt-2 flex-wrap items-end gap-3 rounded-lg border border-dashed border-border/80 bg-background/40 p-3", more ? "flex" : "hidden")}>
        <label className="block text-xs text-muted-foreground">
          تاريخ الإنشاء من
          <input name="from" type="date" defaultValue={values.from} max={today} className={cn(adminInputClass, "mt-1 h-9 w-40")} dir="ltr" />
        </label>
        <label className="block text-xs text-muted-foreground">
          إلى
          <input name="to" type="date" defaultValue={values.to} max={today} className={cn(adminInputClass, "mt-1 h-9 w-40")} dir="ltr" />
        </label>
        <button type="submit" className="inline-flex h-9 items-center rounded-lg border border-input px-3 text-sm hover:border-primary/50">
          تطبيق
        </button>
        <span className="flex flex-wrap gap-1">
          {presets.map((preset) => {
            const active = values.from === preset.from && values.to === preset.to;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => apply({ from: preset.from, to: preset.to })}
                className={cn(
                  "h-9 rounded-md px-2.5 text-xs transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </span>
      </div>
    </form>
  );
}
