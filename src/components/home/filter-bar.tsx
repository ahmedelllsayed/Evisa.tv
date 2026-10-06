"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BoltBadge, ChevronIcon, DocBadge, PlaneBadge, UmbrellaBadge } from "@/components/brand/icons";
import { t, type MessageKey } from "@/lib/i18n";
import type { Holiday } from "@/lib/types";
import type { Destination } from "@/lib/types";
import {
  deliveryFilters,
  documentFilters,
  type HomeFilters,
  typeFilters,
} from "@/lib/visa";
import { cn } from "@/lib/utils";

function countDelivery(destinations: Destination[], id: (typeof deliveryFilters)[number]["id"]) {
  const f = deliveryFilters.find((x) => x.id === id)!;
  return destinations.filter((d) => d.visaRequired && f.test(d.processingHours ?? 0)).length;
}
function countType(destinations: Destination[], id: (typeof typeFilters)[number]["id"]) {
  const f = typeFilters.find((x) => x.id === id)!;
  return destinations.filter((d) => d.visaRequired && f.test(d.visaType)).length;
}
function countDocs(destinations: Destination[], id: (typeof documentFilters)[number]["id"]) {
  const f = documentFilters.find((x) => x.id === id)!;
  return destinations.filter((d) => d.visaRequired && f.test(d.documents)).length;
}

const deliveryKeys: Record<(typeof deliveryFilters)[number]["id"], MessageKey> = {
  any: "filter.anyTime",
  instant: "filter.instant",
  "24h": "filter.h24",
  "3-5": "filter.d35",
  "6-7": "filter.d67",
  "8-30": "filter.d830",
};
const typeKeys: Record<(typeof typeFilters)[number]["id"], MessageKey> = {
  any: "filter.allTypes",
  "e-visa": "filter.evisa",
  sticker: "filter.sticker",
  eta: "filter.eta",
};
const docKeys: Record<(typeof documentFilters)[number]["id"], MessageKey> = {
  any: "filter.anyDocs",
  passport: "filter.onlyPassport",
  bank: "filter.bank",
  itr: "filter.itr",
  schengen: "filter.schengen",
};

function Pill({
  icon,
  label,
  value,
  open,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  open?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5 px-4 py-2.5 text-start">
      {icon}
      <span className="leading-tight">
        <span className="block text-[11px] text-[#8b919a]">{label}</span>
        <span className="block max-w-40 truncate text-[13px] font-semibold text-[#1c1c1c]">{value}</span>
      </span>
      <ChevronIcon open={open} className="ms-1 w-3.5 text-muted-ink" />
    </span>
  );
}

export function FilterBar({
  locale,
  filters,
  onChange,
  destinations,
  holidays,
  compact,
}: {
  locale: string;
  filters: HomeFilters;
  onChange: (next: HomeFilters) => void;
  destinations: Destination[];
  holidays: Holiday[];
  compact?: boolean;
}) {
  const visaDest = useMemo(() => destinations.filter((d) => d.visaRequired), [destinations]);
  const deliveryLabel = t(locale, deliveryKeys[filters.delivery]);
  const typeLabel = t(locale, typeKeys[filters.type]);
  const docsLabel = t(locale, docKeys[filters.documents]);
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  return (
    <div
      className={cn(
        "flex h-[70px] items-stretch divide-x divide-[#eee] overflow-x-auto rounded-full border border-[#efefef] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.05)] scrollbar-none",
        compact ? "py-0" : "",
      )}
    >
      <FilterMenu
        icon={<BoltBadge />}
        label={t(locale, "filter.delivery")}
        value={deliveryLabel}
        items={deliveryFilters.map((f) => ({
          id: f.id,
          label: t(locale, deliveryKeys[f.id]),
          count: countDelivery(visaDest, f.id),
        }))}
        selected={filters.delivery}
        onSelect={(id) => onChange({ ...filters, delivery: id as HomeFilters["delivery"] })}
      />
      <FilterMenu
        icon={<PlaneBadge />}
        label={t(locale, "filter.type")}
        value={typeLabel}
        items={typeFilters.map((f) => ({ id: f.id, label: t(locale, typeKeys[f.id]), count: countType(visaDest, f.id) }))}
        selected={filters.type}
        onSelect={(id) => onChange({ ...filters, type: id as HomeFilters["type"] })}
      />
      <FilterMenu
        icon={<DocBadge />}
        label={t(locale, "filter.documents")}
        value={docsLabel}
        items={documentFilters.map((f) => ({ id: f.id, label: t(locale, docKeys[f.id]), count: countDocs(visaDest, f.id) }))}
        selected={filters.documents}
        onSelect={(id) => onChange({ ...filters, documents: id as HomeFilters["documents"] })}
      />
      <HolidayPicker
        locale={locale}
        value={filters.before}
        holidays={holidays}
        holidaySet={holidaySet}
        onSelect={(before) => onChange({ ...filters, before })}
      />
    </div>
  );
}

function FilterMenu({
  icon,
  label,
  value,
  items,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  items: { id: string; label: string; count: number }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="cursor-pointer">
        <Pill icon={icon} label={label} value={value} open={open} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl p-2">
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-surface",
                  item.id === selected && "bg-brand-50 text-brand-700",
                )}
              >
                <span>
                  {item.label}
                  <span className="text-muted-ink"> · {item.count}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function HolidayPicker({
  locale,
  value,
  holidays,
  holidaySet,
  onSelect,
}: {
  locale: string;
  value: string | null;
  holidays: Holiday[];
  holidaySet: Set<string>;
  onSelect: (iso: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const dateLocale = locale.startsWith("ar") ? "ar-EG" : "en-GB";
  const label = value
    ? new Date(value).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })
    : t(locale, "filter.selectDates");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="cursor-pointer">
        <Pill icon={<UmbrellaBadge />} label={t(locale, "filter.holidays")} value={label} open={open} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto rounded-2xl p-4">
        <p className="mb-2 text-sm font-medium">{t(locale, "filter.before")}</p>
        <Calendar
          mode="single"
          selected={draft}
          onSelect={setDraft}
          modifiers={{ holiday: (day) => holidaySet.has(day.toISOString().slice(0, 10)) }}
          modifiersClassNames={{ holiday: "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-brand" }}
        />
        <ul className="mt-2 max-h-24 overflow-y-auto text-xs text-slate-ink">
          {holidays.slice(0, 6).map((h) => (
            <li key={h.date}>
              {h.name} · {h.date}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-sm"
            onClick={() => {
              onSelect(null);
              setDraft(undefined);
              setOpen(false);
            }}
          >
            {t(locale, "common.clear")}
          </button>
          <button
            type="button"
            disabled={!draft}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            onClick={() => {
              if (!draft) return;
              onSelect(draft.toISOString().slice(0, 10));
              setOpen(false);
            }}
          >
            {t(locale, "common.select")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
