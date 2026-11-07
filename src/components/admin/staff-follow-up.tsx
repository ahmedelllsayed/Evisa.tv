"use client";

import { useState } from "react";
import { adminSaveChecks, adminSendCustomerNote } from "@/app/actions/admin";
import { AdminPanel, adminGhostClass } from "@/components/admin/chrome";
import { FeedbackLine, useRun } from "@/components/admin/applications/use-run";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

type NoteKind = "resume" | "documents" | "review" | "referral";

const checkItems = [
  ["passport", "الجواز ساري ومقروء"],
  ["photo", "الصورة الشخصية مطابقة"],
  ["documents", "المستندات كاملة"],
] as const;

export function StaffFollowUp({ locale, application, gaps = 0, docsReady = false }: { locale: string; application: Application; gaps?: number; docsReady?: boolean }) {
  const [checks, setChecks] = useState(application.staffChecks);
  const [saved, setSaved] = useState(application.staffChecks);
  const [sent, setSent] = useState<NoteKind[]>([]);
  const checklist = useRun();
  const notes = useRun();
  const dirty = checkItems.some(([key]) => checks[key] !== saved[key]);
  const done = checkItems.filter(([key]) => saved[key]).length;
  const unfinished = application.status === "draft" || application.status === "payment_pending";

  const templates: { kind: NoteKind; label: string; detail: string; available: boolean; blocked: string }[] = [
    { kind: "resume", label: "تذكير بإكمال الطلب", detail: "رابط للعودة إلى الطلب وإكمال الدفع.", available: unfinished, blocked: "للمسودات والطلبات بانتظار الدفع فقط." },
    { kind: "documents", label: "تذكير بالمستندات", detail: gaps ? `${gaps} مستند ناقص أو مرفوض.` : "يذكّر العميل بالمستندات الناقصة.", available: gaps > 0, blocked: "لا يوجد نقص في المستندات." },
    { kind: "review", label: "طلب تقييم", detail: "يدعو العميل لتقييم الخدمة.", available: application.status === "approved", blocked: "بعد الموافقة على الطلب." },
    { kind: "referral", label: "رابط الدعوة", detail: "يرسل للعميل رابط دعوة الأصدقاء.", available: true, blocked: "" },
  ];

  return (
    <AdminPanel id="follow-up-panel" title="المتابعة" hint="قائمة تحقق داخلية ورسائل جاهزة للعميل.">
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">قائمة التحقق</p>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {done}/{checkItems.length}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {checkItems.map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={checks[key]}
                  onChange={() => setChecks((current) => ({ ...current, [key]: !current[key] }))}
                  className="size-4 accent-sky-400"
                />
                <span className={cn(checks[key] && "text-muted-foreground line-through decoration-muted-foreground/40")}>{label}</span>
                {key === "documents" && docsReady && !checks.documents ? <span className="ms-auto text-[11px] text-emerald-300">كلها معتمدة</span> : null}
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={checklist.pending || !dirty}
              className={cn(adminGhostClass, "h-8 px-3 text-xs")}
              onClick={() => checklist.run(() => adminSaveChecks(locale, application.id, checks), "حُفظت القائمة.", () => setSaved(checks))}
            >
              {checklist.pending ? "جارٍ الحفظ…" : "حفظ القائمة"}
            </button>
            {dirty ? <span className="text-[11px] text-primary">غير محفوظة</span> : <FeedbackLine feedback={checklist.feedback} />}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">تعليم يدوي للموظفين. لا يغيّر حالة الطلب.</p>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">رسائل للعميل بالبريد</p>
          <ul className="mt-2 space-y-1.5">
            {templates.filter((template) => template.available).map((template) => (
              <li key={template.kind} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{template.label}</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{template.detail}</p>
                </div>
                <button
                  type="button"
                  disabled={notes.pending}
                  onClick={() => notes.run(() => adminSendCustomerNote(locale, application.id, template.kind), `أُرسل «${template.label}».`, () => setSent((list) => [...list, template.kind]))}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    sent.includes(template.kind) ? "border-emerald-500/40 text-emerald-300" : "border-input hover:border-primary/50",
                  )}
                >
                  {sent.includes(template.kind) ? "أُرسل" : "إرسال"}
                </button>
              </li>
            ))}
          </ul>
          {templates.some((template) => !template.available) ? (
            <ul className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted-foreground/80">
              {templates
                .filter((template) => !template.available)
                .map((template) => (
                  <li key={template.kind}>
                    {template.label}: {template.blocked}
                  </li>
                ))}
            </ul>
          ) : null}
          <FeedbackLine feedback={notes.feedback} className="mt-2" />
        </div>
      </div>
    </AdminPanel>
  );
}
