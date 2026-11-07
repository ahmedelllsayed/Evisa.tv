"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Check, Circle, PencilLine, Sparkles } from "lucide-react";
import type { AccountProfileSummary } from "@/lib/account";
import type { PassportHealth, ProfileItem, Tone } from "@/lib/account-insights";
import { countryName } from "@/lib/countries";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/visa";
import { Card, Pill, Ring, SectionTitle, primaryButton, say } from "@/components/account/ui";

const itemText: Record<ProfileItem, [string, string]> = {
  name: ["Name as in passport", "الاسم كما في الجواز"],
  birth: ["Date of birth", "تاريخ الميلاد"],
  nationality: ["Nationality", "الجنسية"],
  passport: ["Passport number", "رقم الجواز"],
  expiry: ["Valid passport expiry", "تاريخ انتهاء صالح للجواز"],
  phone: ["Phone number", "رقم الهاتف"],
  scan: ["Passport scan", "صورة صفحة الجواز"],
  photo: ["Personal photo", "صورة شخصية"],
};

const health: Record<PassportHealth, { tone: Tone; text: [string, string] }> = {
  ok: { tone: "green", text: ["Valid", "صالح"] },
  short: { tone: "amber", text: ["Under 6 months left", "أقل من 6 أشهر"] },
  expired: { tone: "red", text: ["Expired", "منتهي الصلاحية"] },
  missing: { tone: "slate", text: ["Not added", "غير مُضاف"] },
};

export function Details({
  locale,
  profile,
  passport,
  checklist,
}: {
  locale: string;
  profile: AccountProfileSummary;
  passport: PassportHealth;
  checklist: { items: { id: ProfileItem; done: boolean }[]; done: number; total: number; percent: number };
}) {
  const edit = href("/account/profile", locale);
  const nationality = /^[a-z]{2}$/i.test(profile.nationality) ? countryName(profile.nationality, locale) : profile.nationality;
  const state = health[passport];
  const rows: { label: string; value: ReactNode }[] = [
    { label: say(locale, "Full name", "الاسم الكامل"), value: `${profile.firstName} ${profile.lastName}`.trim() },
    { label: say(locale, "Date of birth", "تاريخ الميلاد"), value: profile.dateOfBirth ? formatDate(profile.dateOfBirth, locale) : "" },
    { label: say(locale, "Nationality", "الجنسية"), value: nationality },
    { label: say(locale, "Phone", "الهاتف"), value: profile.phone ? <bdi dir="ltr">{profile.phone}</bdi> : "" },
    { label: say(locale, "Passport number", "رقم الجواز"), value: profile.passportNumber ? <bdi className="font-mono tracking-wide">{profile.passportNumber}</bdi> : "" },
    {
      label: say(locale, "Passport expiry", "انتهاء الجواز"),
      value: profile.passportExpiry ? (
        <span className="flex flex-wrap items-center gap-2">
          {formatDate(profile.passportExpiry, locale)}
          <Pill tone={state.tone} dot>
            {say(locale, ...state.text)}
          </Pill>
        </span>
      ) : (
        ""
      ),
    },
  ];
  const missing = checklist.items.filter((item) => !item.done);

  return (
    <div className="grid min-w-0 gap-4">
      {passport === "expired" || passport === "short" ? (
        <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3 text-sm", passport === "expired" ? "bg-rose-50 text-rose-900" : "bg-amber-50 text-amber-950")}>
          <AlertTriangle aria-hidden className={cn("mt-0.5 size-4 shrink-0", passport === "expired" ? "text-rose-600" : "text-amber-600")} />
          <p className="min-w-0 flex-1">{t(locale, passport === "expired" ? "account.passportExpired" : "account.passportSoon")}</p>
          <Link href={edit} className="shrink-0 font-semibold underline underline-offset-2">
            {say(locale, "Update", "تحديث")}
          </Link>
        </div>
      ) : null}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Card>
          <SectionTitle
            title={say(locale, "Saved details", "بياناتك المحفوظة")}
            hint={t(locale, "account.reuse")}
            action={
              <Link href={edit} className={cn(primaryButton, "h-9")}>
                <PencilLine aria-hidden className="size-4" />
                {t(locale, "account.editProfile")}
              </Link>
            }
          />
          <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="min-w-0 border-b border-[#eef0f7] pb-3">
                <dt className="text-xs text-muted-ink">{row.label}</dt>
                <dd className="mt-1 truncate text-sm font-medium text-[#16182b]">
                  {row.value || <span className="font-normal text-muted-ink">{say(locale, "Not added yet", "لم تُضف بعد")}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className={missing.length ? "max-lg:order-first" : undefined}>
          <div className="flex items-center gap-4">
            <Ring percent={checklist.percent} size={72} label={say(locale, `Profile ${checklist.percent}% complete`, `اكتمال الملف ${checklist.percent}%`)} />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#16182b]">{say(locale, "Profile completeness", "اكتمال الملف")}</h2>
              <p className="mt-0.5 text-sm text-muted-ink">
                {missing.length
                  ? say(locale, `${checklist.done} of ${checklist.total} done`, `أكملت ${checklist.done} من ${checklist.total}`)
                  : say(locale, "Everything is saved", "كل البيانات محفوظة")}
              </p>
            </div>
          </div>
          <ul className="mt-5 grid gap-2">
            {checklist.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 text-sm">
                {item.done ? (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check aria-hidden className="size-3" strokeWidth={3} />
                  </span>
                ) : (
                  <Circle aria-hidden className="size-5 shrink-0 text-[#d3d6e6]" />
                )}
                <span className={item.done ? "text-body" : "font-medium text-[#16182b]"}>{say(locale, ...itemText[item.id])}</span>
                <span className="sr-only">{item.done ? say(locale, "done", "مكتمل") : say(locale, "missing", "ناقص")}</span>
              </li>
            ))}
          </ul>
          {missing.length ? (
            <Link href={edit} className={cn(primaryButton, "mt-5 w-full")}>
              <Sparkles aria-hidden className="size-4" />
              {say(locale, `Add the missing ${missing.length === 1 ? "item" : "items"}`, missing.length === 1 ? "أضف البيان الناقص" : "أضف البيانات الناقصة")}
            </Link>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
