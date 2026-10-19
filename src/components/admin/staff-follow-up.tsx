"use client";

import { useState, useTransition } from "react";
import { adminSaveChecks, adminSendCustomerNote } from "@/app/actions/admin";
import { adminGhostClass, adminPrimaryClass } from "@/components/admin/chrome";
import type { Application } from "@/lib/types";

const notes = [
  ["resume", "تذكير بإكمال الطلب"],
  ["documents", "تذكير بالمستندات"],
  ["review", "طلب تقييم"],
  ["referral", "إرسال رابط الدعوة"],
] as const;

export function StaffFollowUp({ locale, application }: { locale: string; application: Application }) {
  const [checks, setChecks] = useState(application.staffChecks);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(key: keyof Application["staffChecks"]) {
    setChecks((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="mt-4 grid gap-3 border-t border-line pt-4">
      <p className="text-sm font-medium">قائمة التحقق</p>
      <p className="text-xs text-muted-ink">تعليم يدوي فقط. لا يغيّر حالة الطلب.</p>
      {(
        [
          ["passport", "الجواز ساري"],
          ["photo", "الصورة مطابقة"],
          ["documents", "المستندات كاملة"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={checks[key]} onChange={() => toggle(key)} />
          {label}
        </label>
      ))}
      <button
        type="button"
        disabled={pending}
        className={adminGhostClass}
        onClick={() =>
          start(async () => {
            const result = await adminSaveChecks(locale, application.id, checks);
            setMessage(result.ok ? "حُفظت القائمة." : result.error);
          })
        }
      >
        حفظ القائمة
      </button>
      <p className="text-sm font-medium">رسائل يرسلها الموظف</p>
      {notes.map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          disabled={pending}
          className={kind === "resume" ? adminPrimaryClass : adminGhostClass}
          onClick={() =>
            start(async () => {
              const result = await adminSendCustomerNote(locale, application.id, kind);
              setMessage(result.ok ? "أُرسلت الرسالة." : result.error);
            })
          }
        >
          {label}
        </button>
      ))}
      {message ? <p className="text-xs text-muted-ink">{message}</p> : null}
    </div>
  );
}
