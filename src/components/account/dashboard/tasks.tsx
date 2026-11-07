"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, CheckCircle2, CreditCard, FilePlus2, FileWarning, IdCard, PencilLine, UserRound, type LucideIcon } from "lucide-react";
import type { IssuedVisaRow, UserFileRow } from "@/lib/account";
import type { AccountTask, PassportHealth, Tone } from "@/lib/account-insights";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { docLabel } from "@/lib/localize";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/visa";
import { Card, SectionTitle, primaryButton, quietButton, say, secondaryButton } from "@/components/account/ui";
import { destinationName, documentCount, plural } from "./model";

type TaskView = { icon: LucideIcon; tone: Tone; title: string; body: string; cta: string; to: string };

const iconTone: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
};

type Context = {
  locale: string;
  apps: Map<string, Application>;
  visas: IssuedVisaRow[];
  documents: UserFileRow[];
  passport: PassportHealth;
  profilePercent: number;
};

function describe(task: AccountTask, ctx: Context): TaskView {
  const { locale } = ctx;
  const id = task.applicationId ?? "";
  const app = ctx.apps.get(id);
  const name = app ? destinationName(app, locale) : (ctx.visas.find((visa) => visa.applicationId === id)?.destinationName ?? "");
  const details = (hash: string) => href(`/account/applications/${id}${hash}`, locale);
  const count = task.count ?? 1;
  switch (task.kind) {
    case "pay": {
      const money = app ? formatMoney(app.totalAmount, app.currency, locale) : "";
      return {
        icon: CreditCard,
        tone: "amber",
        title: say(locale, `Pay for your ${name} application`, `ادفع رسوم طلب ${name}`),
        body: say(
          locale,
          `${money} due. Processing and your target date start once it is paid.`,
          `المبلغ المستحق ${money}. تبدأ المعالجة ويُحدَّد التاريخ المستهدف بعد الدفع.`,
        ),
        cta: say(locale, "Pay now", "ادفع الآن"),
        to: href(`/apply/${id}`, locale),
      };
    }
    case "fix_document": {
      const doc = ctx.documents.find((row) => row.applicationId === id && row.status === "rejected");
      return {
        icon: FileWarning,
        tone: "red",
        title: say(
          locale,
          count === 1 ? `A document was rejected on your ${name} application` : `${count} documents were rejected on your ${name} application`,
          `رُفض ${documentCount(locale, count)} في طلب ${name}`,
        ),
        body: doc?.rejectReason
          ? `${docLabel(doc.kind, locale)}: ${doc.rejectReason}`
          : say(locale, "Upload a clearer copy so we can continue.", "ارفع نسخة أوضح لنكمل مراجعة طلبك."),
        cta: count === 1 ? say(locale, "Replace document", "استبدال المستند") : say(locale, "Replace documents", "استبدال المستندات"),
        to: details("#documents"),
      };
    }
    case "missing_document":
      return {
        icon: FilePlus2,
        tone: "amber",
        title: say(locale, `${documentCount(locale, count)} missing on your ${name} application`, `ينقص ${documentCount(locale, count)} في طلب ${name}`),
        body: say(locale, "Send them to our team so your application keeps moving.", "أرسلها لفريقنا ليستمر العمل على طلبك دون تأخير."),
        cta: say(locale, "Review documents", "مراجعة المستندات"),
        to: details("#documents"),
      };
    case "visa_ready":
      return {
        icon: BadgeCheck,
        tone: "green",
        title: say(locale, `Your ${name} visa is ready`, `تأشيرة ${name} جاهزة`),
        body: say(locale, "Download it and keep a printed copy with your passport.", "نزّلها واحتفظ بنسخة مطبوعة مع جواز سفرك."),
        cta: say(locale, "Download visa", "تنزيل التأشيرة"),
        to: details("#visa"),
      };
    case "draft":
      return {
        icon: PencilLine,
        tone: "brand",
        title: say(locale, `Finish your ${name} application`, `أكمل طلب ${name}`),
        body: say(locale, "Your progress is saved. Finish the details, then pay to start processing.", "حفظنا تقدّمك. أكمل البيانات ثم ادفع لتبدأ المعالجة."),
        cta: say(locale, "Finish application", "إكمال الطلب"),
        to: href(`/apply/${id}`, locale),
      };
    case "passport":
      return {
        icon: IdCard,
        tone: ctx.passport === "expired" ? "red" : "amber",
        title:
          ctx.passport === "expired"
            ? say(locale, "Your passport has expired", "انتهت صلاحية جواز سفرك")
            : say(locale, "Your passport expires soon", "جواز سفرك ينتهي قريباً"),
        body: t(locale, ctx.passport === "expired" ? "account.passportExpired" : "account.passportSoon"),
        cta: say(locale, "Update passport", "تحديث بيانات الجواز"),
        to: href("/account/profile#profile-passportExpiry", locale),
      };
    default:
      return {
        icon: UserRound,
        tone: "brand",
        title: say(locale, `Complete your profile (${ctx.profilePercent}%)`, `أكمل ملفك الشخصي (${ctx.profilePercent}%)`),
        body: say(
          locale,
          "Save your passport details and photo once and we fill them in on every application.",
          "احفظ بيانات جوازك وصورتك مرة واحدة، ونملؤها تلقائياً في كل طلب.",
        ),
        cta: say(locale, "Complete profile", "إكمال الملف"),
        to: href("/account/profile", locale),
      };
  }
}

const VISIBLE = 4;

export function TaskList({ tasks, ...ctx }: Context & { tasks: AccountTask[] }) {
  const { locale } = ctx;
  const [all, setAll] = useState(false);
  const shown = all ? tasks : tasks.slice(0, VISIBLE);
  return (
    <Card>
      <SectionTitle
        title={say(locale, "To do", "المطلوب منك")}
        hint={
          tasks.length
            ? `${plural(locale, tasks.length, ["item", "items"], ["مهمة واحدة", "مهمتان", "مهام", "مهمة"])} ${say(locale, "waiting for you", "بانتظارك")}`
            : undefined
        }
      />
      {tasks.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-4">
          <CheckCircle2 aria-hidden className="size-8 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900">{say(locale, "You're all caught up", "لا يوجد ما يتطلب إجراءً منك")}</p>
            <p className="mt-0.5 text-sm text-emerald-800/80">
              {say(locale, "We'll notify you as soon as anything changes.", "سنُرسل لك إشعاراً فور أي تحديث على طلباتك.")}
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#eef0f7]">
          {shown.map((task, index) => {
            const view = describe(task, ctx);
            const Icon = view.icon;
            return (
              <li key={task.id} className="flex min-w-0 flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconTone[view.tone])}>
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-[#16182b]">{view.title}</p>
                    <p className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-muted-ink">{view.body}</p>
                  </div>
                </div>
                <Link href={view.to} className={cn(index === 0 ? primaryButton : secondaryButton, "h-9 shrink-0 self-start ms-[52px] sm:ms-0 sm:self-center")}>
                  {view.cta}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {tasks.length > VISIBLE ? (
        <button type="button" onClick={() => setAll((value) => !value)} className={cn(quietButton, "mt-3")}>
          {all ? say(locale, "Show less", "عرض أقل") : say(locale, `Show all (${tasks.length})`, `عرض الكل (${tasks.length})`)}
        </button>
      ) : null}
    </Card>
  );
}
