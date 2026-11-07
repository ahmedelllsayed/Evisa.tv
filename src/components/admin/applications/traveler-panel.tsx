"use client";

import { useState, type ChangeEvent } from "react";
import { adminPatchTraveler } from "@/app/actions/admin";
import { AdminEmpty, Pill, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import type { Traveler } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FeedbackLine, useRun } from "./use-run";

const sexLabel: Record<string, string> = { male: "ذكر", female: "أنثى", m: "ذكر", f: "أنثى" };

function addMonths(day: string, months: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function passportWarning(traveler: Traveler, today: string, departure: string | null) {
  if (!traveler.passportExpiry) return null;
  if (traveler.passportExpiry < today) return { tone: "danger" as const, text: "الجواز منتهي" };
  const base = departure && departure > today ? departure : today;
  if (traveler.passportExpiry < addMonths(base, 6)) {
    return { tone: "warning" as const, text: departure ? "صلاحيته أقل من 6 أشهر بعد السفر" : "صلاحيته أقل من 6 أشهر" };
  }
  return null;
}

export function TravelerPanel({
  locale,
  travelers,
  today,
  departureDate,
}: {
  locale: string;
  travelers: Traveler[];
  today: string;
  departureDate: string | null;
}) {
  if (!travelers.length) return <AdminEmpty title="لا يوجد مسافرون">لم يُضف العميل بيانات المسافرين بعد.</AdminEmpty>;
  return (
    <div className="space-y-3">
      {travelers.map((traveler, index) => (
        <TravelerCard key={traveler.id} locale={locale} traveler={traveler} index={index} warning={passportWarning(traveler, today, departureDate)} />
      ))}
    </div>
  );
}

function TravelerCard({
  locale,
  traveler,
  index,
  warning,
}: {
  locale: string;
  traveler: Traveler;
  index: number;
  warning: { tone: "danger" | "warning"; text: string } | null;
}) {
  const initial = {
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    passportNumber: traveler.passportNumber ?? "",
    nationality: traveler.nationality ?? "",
  };
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const { pending, run, feedback } = useRun();
  const dirty = (Object.keys(values) as (keyof typeof values)[]).some((key) => values[key] !== saved[key]);
  const invalid = !values.firstName.trim() || !values.lastName.trim();
  const set = (key: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const facts = [
    { label: "تاريخ الميلاد", value: traveler.dateOfBirth },
    { label: "النوع", value: traveler.sex ? sexLabel[traveler.sex.toLowerCase()] ?? traveler.sex : null },
    { label: "انتهاء الجواز", value: traveler.passportExpiry },
  ];

  return (
    <form
      className="overflow-hidden rounded-xl border bg-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid || !dirty) return;
        run(() => adminPatchTraveler(locale, traveler.id, values), "حُفظت بيانات المسافر.", () => setSaved(values));
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">{index + 1}</span>
          <p className="truncate text-sm font-semibold">{`${saved.firstName} ${saved.lastName}`.trim() || "مسافر بدون اسم"}</p>
        </div>
        {warning ? (
          <Pill tone={warning.tone} dot>
            {warning.text}
          </Pill>
        ) : null}
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="block text-xs text-muted-foreground">
          الاسم الأول
          <input value={values.firstName} onChange={set("firstName")} dir="ltr" className={cn(adminInputClass, !values.firstName.trim() && "border-rose-500/70")} />
        </label>
        <label className="block text-xs text-muted-foreground">
          اسم العائلة
          <input value={values.lastName} onChange={set("lastName")} dir="ltr" className={cn(adminInputClass, !values.lastName.trim() && "border-rose-500/70")} />
        </label>
        <label className="block text-xs text-muted-foreground">
          رقم الجواز
          <input value={values.passportNumber} onChange={set("passportNumber")} dir="ltr" className={cn(adminInputClass, "font-mono uppercase")} />
        </label>
        <label className="block text-xs text-muted-foreground">
          الجنسية (رمز الدولة)
          <input value={values.nationality} onChange={set("nationality")} dir="ltr" maxLength={3} placeholder="EG" className={cn(adminInputClass, "font-mono uppercase")} />
        </label>
        <dl className="grid grid-cols-3 gap-3 rounded-lg border border-dashed border-border/80 bg-background/40 px-3 py-2.5 sm:col-span-2">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{fact.label}</dt>
              <dd className="mt-0.5 truncate font-mono text-xs tabular-nums">{fact.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-background/30 px-5 py-3">
        <span className="text-xs">
          {feedback ? <FeedbackLine feedback={feedback} /> : dirty ? <span className="text-primary">تعديلات غير محفوظة</span> : invalid ? <span className="text-rose-300">الاسم مطلوب.</span> : <span className="text-muted-foreground">يعدّل الموظف الاسم والجواز والجنسية فقط.</span>}
        </span>
        <span className="flex items-center gap-2">
          {dirty ? (
            <button type="button" onClick={() => setValues(saved)} className="h-9 px-2 text-sm text-muted-foreground hover:text-foreground">
              تراجع
            </button>
          ) : null}
          <button disabled={pending || !dirty || invalid} className={adminPrimaryClass}>
            {pending ? "جارٍ الحفظ…" : "حفظ المسافر"}
          </button>
        </span>
      </footer>
    </form>
  );
}
