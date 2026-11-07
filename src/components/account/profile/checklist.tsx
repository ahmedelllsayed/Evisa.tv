"use client";

import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { ProfileItem } from "@/lib/account-insights";
import { isArabicLocale } from "@/lib/i18n";
import { cardClass, Ring, say } from "@/components/account/ui";
import { cn } from "@/lib/utils";

const itemText: Record<ProfileItem, [string, string]> = {
  name: ["Name as in passport", "الاسم كما في الجواز"],
  birth: ["Date of birth", "تاريخ الميلاد"],
  nationality: ["Nationality", "الجنسية"],
  passport: ["Passport number", "رقم الجواز"],
  expiry: ["Valid passport expiry", "تاريخ انتهاء ساري"],
  phone: ["Phone number", "رقم الهاتف"],
  scan: ["Passport scan", "صورة صفحة الجواز"],
  photo: ["Personal photo", "الصورة الشخصية"],
};

export function ProfileChecklist({
  locale,
  items,
  done,
  total,
  percent,
  alert,
  onJump,
}: {
  locale: string;
  items: { id: ProfileItem; done: boolean }[];
  done: number;
  total: number;
  percent: number;
  alert?: ReactNode;
  onJump: (item: ProfileItem) => void;
}) {
  const Arrow = isArabicLocale(locale) ? ChevronLeft : ChevronRight;
  const complete = done === total;
  return (
    <section className={cn(cardClass, "p-5")} aria-labelledby="profile-progress-title">
      <div className="flex items-center gap-4">
        <Ring percent={percent} size={64} label={say(locale, `Profile ${percent}% complete`, `الملف مكتمل بنسبة ${percent}%`)} />
        <div className="min-w-0">
          <h2 id="profile-progress-title" className="text-base font-semibold text-[#16182b]">
            {complete ? say(locale, "Profile complete", "ملفك مكتمل") : say(locale, "Complete your profile", "أكمل ملفك")}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-ink">
            {complete
              ? say(locale, "New applications fill in by themselves.", "الطلبات الجديدة ستُملأ تلقائياً.")
              : say(locale, `${done} of ${total} done. Finish it to apply faster.`, `أنجزت ${done} من ${total}. أكمله لتقدّم أسرع.`)}
          </p>
        </div>
      </div>
      {alert}
      <ul className="mt-4 grid grid-cols-2 gap-x-1 gap-y-0.5 lg:grid-cols-1">
        {[...items.filter((item) => !item.done), ...items.filter((item) => item.done)].map((item) => {
          const [en, ar] = itemText[item.id];
          const text = say(locale, en, ar);
          return (
            <li key={item.id} className={cn("min-w-0", !item.done && "col-span-2 lg:col-span-1")}>
              {item.done ? (
                <span className="flex min-h-9 items-center gap-2.5 rounded-xl px-2 py-1 text-sm leading-snug text-muted-ink">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="min-w-0">{text}</span>
                  <span className="sr-only">{say(locale, "done", "تم")}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onJump(item.id)}
                  className="group flex h-9 w-full items-center gap-2.5 rounded-xl bg-surface/70 px-2 text-start text-sm font-medium text-[#16182b] transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
                >
                  <span className="size-5 shrink-0 rounded-full border-2 border-dashed border-amber-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{text}</span>
                  <span className="sr-only">{say(locale, "missing", "ناقص")}</span>
                  <Arrow className="size-4 shrink-0 text-brand-500 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PrivacyNote({ locale, className }: { locale: string; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-[22px] border border-[#e3e5f2] bg-surface/70 p-4", className)}>
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
      <p className="text-xs leading-relaxed text-muted-ink">
        <span className="block text-sm font-semibold text-[#16182b]">{say(locale, "Your data stays private", "بياناتك في أمان")}</span>
        {say(
          locale,
          "Your files are stored on Evisa's own servers and are only used for your visa applications.",
          "ملفاتك محفوظة على خوادم Evisa الخاصة، ولا تُستخدم إلا في طلبات تأشيراتك.",
        )}
      </p>
    </div>
  );
}
