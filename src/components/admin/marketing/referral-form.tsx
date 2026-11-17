"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSaveReferral } from "@/app/actions/marketing";
import { AdminError, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import type { MarketingSettings, RewardRule } from "@/lib/data/marketing/settings";

function RuleFields({ title, rule, onChange, disabled }: { title: string; rule: RewardRule; onChange: (next: RewardRule) => void; disabled?: boolean }) {
  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-sm">
          النوع
          <select value={rule.kind} disabled={disabled} onChange={(event) => onChange({ ...rule, kind: event.target.value as RewardRule["kind"] })} className={adminSelectClass}>
            <option value="percent">نسبة</option>
            <option value="fixed">مبلغ</option>
          </select>
        </label>
        <label className="block text-sm">
          القيمة
          <input type="number" min={1} dir="ltr" value={rule.value} disabled={disabled} onChange={(event) => onChange({ ...rule, value: Number(event.target.value) })} className={adminInputClass} />
        </label>
        <label className="block text-sm">
          يخصم من
          <select value={rule.appliesTo} disabled={disabled} onChange={(event) => onChange({ ...rule, appliesTo: event.target.value as RewardRule["appliesTo"] })} className={adminSelectClass}>
            <option value="service">رسم الخدمة</option>
            <option value="total">الإجمالي</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}

export function ReferralForm({ locale, initial, canEdit }: { locale: string; initial: MarketingSettings["referral"]; canEdit: boolean }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        start(async () => {
          const result = await adminSaveReferral(locale, draft);
          if (!result.ok) setError("تعذر الحفظ.");
          else {
            setDraft(result.referral);
            setNotice(result.referral.enabled ? "البرنامج مفعّل." : "حُفظ. البرنامج متوقف.");
            router.refresh();
          }
        });
      }}
    >
      {error ? <AdminError>{error}</AdminError> : null}
      {notice ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.enabled} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
        البرنامج مفعّل
      </label>
      <div className="grid gap-3 lg:grid-cols-2">
        <RuleFields title="خصم الصديق على أول طلب" rule={draft.friend} disabled={!canEdit} onChange={(friend) => setDraft({ ...draft, friend })} />
        <div className="space-y-2">
          <RuleFields title="رمز الداعي بعد دفع الصديق" rule={draft.reward} disabled={!canEdit} onChange={(reward) => setDraft({ ...draft, reward: { ...draft.reward, ...reward } })} />
          <label className="block text-sm">
            صلاحية رمز الداعي بالأيام
            <input type="number" min={1} dir="ltr" value={draft.reward.validDays} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, reward: { ...draft.reward, validDays: Number(event.target.value) } })} className={adminInputClass} />
          </label>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        الصديق يفتح رابط الداعي ثم يسجّل، فيُطبَّق خصمه تلقائياً على أول طلب. بعد أول دفع ناجح يصل الداعي رمز فردي في حسابه، ويُلغى الرمز إن استُرد المبلغ قبل استخدامه.
      </p>
      <button type="submit" className={adminPrimaryClass} disabled={!canEdit || pending}>حفظ</button>
    </form>
  );
}
