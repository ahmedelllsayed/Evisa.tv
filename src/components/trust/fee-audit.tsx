"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeeDirection = "up" | "down" | "same";

export type FeeAuditItem = {
  id: string;
  date: string;
  destinationKey: string;
  destination: string;
  option: string | null;
  link: string | null;
  before: string;
  after: string;
  difference: string;
  percent: string | null;
  direction: FeeDirection;
  reason: string | null;
};

export type FeeAuditCopy = {
  destination: string;
  allDestinations: string;
  direction: string;
  all: string;
  increases: string;
  decreases: string;
  showing: string;
  before: string;
  after: string;
  reason: string;
  noReason: string;
  noMatch: string;
  reset: string;
  visaPage: string;
  rtl: boolean;
};

const tone: Record<FeeDirection, string> = {
  up: "bg-amber-50 text-amber-900 ring-amber-200",
  down: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  same: "bg-slate-100 text-slate-600 ring-slate-200",
};

const icon = { up: TrendingUp, down: TrendingDown, same: Minus };

export function FeeAudit({ items, destinations, copy }: { items: FeeAuditItem[]; destinations: { key: string; label: string; count: number }[]; copy: FeeAuditCopy }) {
  const [destination, setDestination] = useState("all");
  const [direction, setDirection] = useState<"all" | "up" | "down">("all");
  const visible = useMemo(
    () => items.filter((item) => (destination === "all" || item.destinationKey === destination) && (direction === "all" || item.direction === direction)),
    [items, destination, direction],
  );
  const Arrow = copy.rtl ? ArrowLeft : ArrowRight;
  const directions: { id: "all" | "up" | "down"; label: string }[] = [
    { id: "all", label: copy.all },
    { id: "up", label: copy.increases },
    { id: "down", label: copy.decreases },
  ];
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-col gap-3 rounded-[18px] border border-[#e3e5f2] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <span className="shrink-0 text-muted-ink">{copy.destination}</span>
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-full border border-[#e3e5f2] bg-white px-4 text-sm text-[#16182b] focus-visible:outline-2 focus-visible:outline-brand sm:w-60 sm:flex-none"
          >
            <option value="all">{copy.allDestinations}</option>
            {destinations.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} ({item.count})
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label={copy.direction} className="flex min-w-0 gap-1 rounded-full bg-[#f4f5fd] p-1">
          {directions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={direction === item.id}
              onClick={() => setDirection(item.id)}
              className={cn(
                "h-8 flex-1 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors sm:flex-none",
                direction === item.id ? "bg-[#16182b] text-white" : "text-body hover:text-[#16182b]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-muted-ink">
        {copy.showing.replace("{shown}", String(visible.length)).replace("{total}", String(items.length))}
      </p>

      {visible.length ? (
        <ol className="mt-3 grid gap-3">
          {visible.map((item) => {
            const Icon = icon[item.direction];
            return (
              <li key={item.id} className="min-w-0 rounded-[18px] border border-[#e3e5f2] bg-white p-4 md:p-5">
                <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-ink">{item.date}</p>
                    <p className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      {item.link ? (
                        <Link href={item.link} className="font-semibold text-[#16182b] hover:text-brand-700 hover:underline" title={copy.visaPage}>
                          {item.destination}
                        </Link>
                      ) : (
                        <span className="font-semibold text-[#16182b]">{item.destination}</span>
                      )}
                      {item.option ? <span className="min-w-0 text-sm text-muted-ink">{item.option}</span> : null}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-body">
                      <span className="text-muted-ink">{copy.reason}: </span>
                      {item.reason ? <bdi>{item.reason}</bdi> : <span className="text-muted-ink">{copy.noReason}</span>}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-3 md:justify-end">
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-sm">
                        <span className="block text-[11px] text-muted-ink">{copy.before}</span>
                        <span className="text-muted-ink line-through decoration-slate-300">{item.before}</span>
                      </span>
                      <Arrow aria-hidden className="size-4 shrink-0 text-muted-ink" />
                      <span className="text-sm">
                        <span className="block text-[11px] text-muted-ink">{copy.after}</span>
                        <span className="font-semibold text-[#16182b]">{item.after}</span>
                      </span>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset", tone[item.direction])}>
                      <Icon aria-hidden className="size-3.5" />
                      <bdi>{item.difference}</bdi>
                      {item.percent ? <bdi className="opacity-80">({item.percent})</bdi> : null}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-3 rounded-[18px] border border-dashed border-[#d9dcec] bg-white px-5 py-10 text-center">
          <p className="text-sm text-body">{copy.noMatch}</p>
          <button
            type="button"
            onClick={() => {
              setDestination("all");
              setDirection("all");
            }}
            className="mt-3 text-sm font-semibold text-brand-700 hover:underline"
          >
            {copy.reset}
          </button>
        </div>
      )}
    </div>
  );
}
