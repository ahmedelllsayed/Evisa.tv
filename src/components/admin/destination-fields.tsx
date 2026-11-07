"use client";

import { useId, useState } from "react";
import { adminInputClass, adminSelectClass } from "@/components/admin/chrome";
import {
  hoursToParts,
  parseSpan,
  partsToHours,
  spanPhrase,
  timePreview,
  type SpanUnit,
  type TimeUnit,
} from "@/lib/destination-fields";

const compactInput = "h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

export function money(value: number) {
  return `${Math.max(0, Math.round(Number.isFinite(value) ? value : 0)).toLocaleString("ar-EG")} ج.م`;
}

export function FeeSummary({
  embassy,
  govFee,
  serviceFee,
  expressFee,
  expressOn,
}: {
  embassy: boolean;
  govFee: string;
  serviceFee: string;
  expressFee: string;
  expressOn: boolean;
}) {
  const gov = Number(govFee) || 0;
  const service = Number(serviceFee) || 0;
  const extra = expressOn ? Number(expressFee) || 0 : 0;
  const chargedGov = embassy ? 0 : gov;
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/[0.05] p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p>
          <span className="text-muted-foreground">يدفع العميل في المدة العادية: </span>
          <strong className="font-mono tabular-nums">{money(chargedGov + service)}</strong>
        </p>
        {expressOn && (
          <p>
            <span className="text-muted-foreground">مع السرعة: </span>
            <strong className="font-mono tabular-nums">{money(chargedGov + service + extra)}</strong>
          </p>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {embassy
          ? "العميل يدفع رسوم المعالجة فقط. الرسوم الحكومية تُسدد في السفارة ولا تُضاف إلى الطلب."
          : `يشمل ${money(chargedGov)} رسوماً حكومية و${money(service)} رسوم معالجة.`}
      </p>
    </div>
  );
}

export function DurationField({
  hours,
  name,
  onHours,
}: {
  hours: number | null;
  name: string;
  onHours?: (hours: number | null) => void;
}) {
  const initial = hoursToParts(hours);
  const [amount, setAmount] = useState(initial.amount);
  const [unit, setUnit] = useState<TimeUnit>(initial.unit);
  const total = partsToHours(amount, unit);
  return (
    <div className="mt-1.5">
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(event) => {
            const next = event.target.value;
            setAmount(next);
            onHours?.(partsToHours(next, unit));
          }}
          className={`${compactInput} w-24`}
          aria-label="العدد"
        />
        <select
          value={unit}
          onChange={(event) => {
            const next = event.target.value as TimeUnit;
            setUnit(next);
            onHours?.(partsToHours(amount, next));
          }}
          className={`${compactInput} min-w-0 flex-1`}
          aria-label="الوحدة"
        >
          <option value="hour">ساعة</option>
          <option value="day">يوم</option>
          <option value="month">شهر</option>
        </select>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{timePreview(amount, unit)}</p>
      <input type="hidden" name={name} value={total ?? ""} />
    </div>
  );
}

export function SpanField({
  label,
  name,
  nameAr,
  en,
  ar,
  onPhrase,
}: {
  label: string;
  name: string;
  nameAr: string;
  en: string | null;
  ar: string | null;
  onPhrase?: (phrase: { en: string; ar: string } | null) => void;
}) {
  const parsed = parseSpan(en, ar);
  const [custom, setCustom] = useState(parsed == null && Boolean(en || ar));
  const [amount, setAmount] = useState(parsed?.amount ?? "");
  const [unit, setUnit] = useState<SpanUnit>(parsed?.unit ?? "day");
  const [freeEn, setFreeEn] = useState(en ?? "");
  const [freeAr, setFreeAr] = useState(ar ?? "");
  const phrase = custom ? (freeEn || freeAr ? { en: freeEn, ar: freeAr } : null) : spanPhrase(amount, unit);
  function emit(next: { en: string; ar: string } | null) {
    onPhrase?.(next);
  }
  return (
    <div className="min-w-0 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground/90">{label}</span>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => {
            const nextCustom = !custom;
            setCustom(nextCustom);
            emit(nextCustom ? (freeEn || freeAr ? { en: freeEn, ar: freeAr } : null) : spanPhrase(amount, unit));
          }}
        >
          {custom ? "اختيار من القائمة" : "نص حر"}
        </button>
      </div>
      {custom ? (
        <div className="grid gap-2">
          <input
            name={name}
            value={freeEn}
            dir="ltr"
            onChange={(event) => {
              const next = event.target.value;
              setFreeEn(next);
              emit(next || freeAr ? { en: next, ar: freeAr } : null);
            }}
            placeholder="EN · 30 days"
            aria-label={`${label} بالإنجليزية`}
            className={adminInputClass}
          />
          <input
            name={nameAr}
            value={freeAr}
            dir="rtl"
            onChange={(event) => {
              const next = event.target.value;
              setFreeAr(next);
              emit(freeEn || next ? { en: freeEn, ar: next } : null);
            }}
            placeholder="AR · 30 يوماً"
            aria-label={`${label} بالعربية`}
            className={`${adminInputClass} text-right`}
          />
        </div>
      ) : (
        <>
          <div className="mt-1.5 flex gap-2">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(event) => {
                const next = event.target.value;
                setAmount(next);
                emit(spanPhrase(next, unit));
              }}
              className={`${compactInput} w-24`}
              aria-label={`${label} العدد`}
            />
            <select
              value={unit}
              onChange={(event) => {
                const next = event.target.value as SpanUnit;
                setUnit(next);
                emit(spanPhrase(amount, next));
              }}
              className={`${compactInput} min-w-0 flex-1`}
              aria-label={`${label} الوحدة`}
            >
              <option value="day">يوم</option>
              <option value="month">شهر</option>
              <option value="year">سنة</option>
            </select>
          </div>
          {phrase ? <p className="mt-1.5 text-xs text-muted-foreground">{phrase.ar} · <span dir="ltr">{phrase.en}</span></p> : null}
          <input type="hidden" name={name} value={phrase?.en ?? ""} />
          <input type="hidden" name={nameAr} value={phrase?.ar ?? ""} />
        </>
      )}
    </div>
  );
}

export function PairedSelect({
  label,
  name,
  nameAr,
  value,
  options,
  onValue,
  hint,
}: {
  label: string;
  name: string;
  nameAr?: string;
  value: string | null;
  options: { value: string; label: string; ar?: string }[];
  onValue?: (value: string) => void;
  hint?: string;
}) {
  const id = useId();
  const fallback = options[0]?.value ?? "";
  const [current, setCurrent] = useState(value && options.some((option) => option.value === value) ? value : fallback);
  const ar = options.find((option) => option.value === current)?.ar ?? "";
  return (
    <div className="min-w-0 text-sm">
      <label htmlFor={id} className="font-medium text-foreground/90">
        {label}
      </label>
      <select
        id={id}
        value={current}
        onChange={(event) => {
          setCurrent(event.target.value);
          onValue?.(event.target.value);
        }}
        className={adminSelectClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      <input type="hidden" name={name} value={current} />
      {nameAr ? <input type="hidden" name={nameAr} value={ar} /> : null}
    </div>
  );
}
