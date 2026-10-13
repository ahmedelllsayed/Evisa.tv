"use client";

import { useState } from "react";
import { adminInputClass } from "@/components/admin/chrome";
import {
  hoursToParts,
  parseSpan,
  partsToHours,
  spanPhrase,
  timePreview,
  type SpanUnit,
  type TimeUnit,
} from "@/lib/destination-fields";

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
    <div className="mt-3 rounded-xl bg-white p-3 text-sm">
      <p>
        يدفع في المدة العادية: <strong>{money(chargedGov + service)}</strong>
      </p>
      {expressOn && (
        <p className="mt-1">
          يدفع مع السرعة: <strong>{money(chargedGov + service + extra)}</strong>
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-muted-ink">
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
    <div className="mt-2">
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
          className="h-10 w-24 rounded-lg border border-line px-3 text-sm"
          aria-label="العدد"
        />
        <select
          value={unit}
          onChange={(event) => {
            const next = event.target.value as TimeUnit;
            setUnit(next);
            onHours?.(partsToHours(amount, next));
          }}
          className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm"
          aria-label="الوحدة"
        >
          <option value="hour">ساعة</option>
          <option value="day">يوم</option>
          <option value="month">شهر</option>
        </select>
      </div>
      <p className="mt-1 text-xs text-muted-ink">{timePreview(amount, unit)}</p>
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
    <div className="text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <button
          type="button"
          className="text-xs text-brand"
          onClick={() => {
            const nextCustom = !custom;
            setCustom(nextCustom);
            emit(nextCustom ? (freeEn || freeAr ? { en: freeEn, ar: freeAr } : null) : spanPhrase(amount, unit));
          }}
        >
          {custom ? "قائمة" : "نص حر"}
        </button>
      </div>
      {custom ? (
        <div className="mt-1 grid gap-2">
          <input
            name={name}
            value={freeEn}
            onChange={(event) => {
              const next = event.target.value;
              setFreeEn(next);
              emit(next || freeAr ? { en: next, ar: freeAr } : null);
            }}
            placeholder="بالإنجليزية"
            className={adminInputClass}
          />
          <input
            name={nameAr}
            value={freeAr}
            onChange={(event) => {
              const next = event.target.value;
              setFreeAr(next);
              emit(freeEn || next ? { en: freeEn, ar: next } : null);
            }}
            placeholder="بالعربية"
            className={adminInputClass}
          />
        </div>
      ) : (
        <>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(event) => {
                const next = event.target.value;
                setAmount(next);
                emit(spanPhrase(next, unit));
              }}
              className="h-10 w-24 rounded-lg border border-line px-3 text-sm"
              aria-label={`${label} العدد`}
            />
            <select
              value={unit}
              onChange={(event) => {
                const next = event.target.value as SpanUnit;
                setUnit(next);
                emit(spanPhrase(amount, next));
              }}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm"
              aria-label={`${label} الوحدة`}
            >
              <option value="day">يوم</option>
              <option value="month">شهر</option>
              <option value="year">سنة</option>
            </select>
          </div>
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
}: {
  label: string;
  name: string;
  nameAr?: string;
  value: string | null;
  options: { value: string; label: string; ar?: string }[];
  onValue?: (value: string) => void;
}) {
  const fallback = options[0]?.value ?? "";
  const [current, setCurrent] = useState(value && options.some((option) => option.value === value) ? value : fallback);
  const ar = options.find((option) => option.value === current)?.ar ?? "";
  return (
    <label className="text-sm">
      {label}
      <select
        value={current}
        onChange={(event) => {
          setCurrent(event.target.value);
          onValue?.(event.target.value);
        }}
        className={adminInputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input type="hidden" name={name} value={current} />
      {nameAr ? <input type="hidden" name={nameAr} value={ar} /> : null}
    </label>
  );
}
