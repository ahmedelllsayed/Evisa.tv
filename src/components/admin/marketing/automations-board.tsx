"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteAutomation, adminSaveAutomation, adminSetAutomationActive } from "@/app/actions/marketing";
import { AdminError, Pill, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import type { Channel } from "@/lib/marketing/audience";
import { channelLabels, marketingDate, triggerLabels } from "@/lib/marketing/labels";
import { cn } from "@/lib/utils";

export type AutomationRow = {
  id: string;
  name: string;
  trigger: "abandoned" | "lapsed" | "approved" | "signup";
  delayHours: number;
  channel: Channel;
  templateId: string | null;
  templateName: string | null;
  couponId: string | null;
  couponCode: string | null;
  uniqueCodes: boolean;
  active: boolean;
  lastRunAt: string | null;
  sent: number;
  pending: number;
  failed: number;
  skipped: number;
  clicks: number;
};

type Draft = {
  id: string | null;
  name: string;
  trigger: AutomationRow["trigger"];
  amount: number;
  unit: "hours" | "days";
  channel: Channel;
  templateId: string | null;
  couponId: string | null;
  uniqueCodes: boolean;
};

const blank: Draft = { id: null, name: "", trigger: "abandoned", amount: 24, unit: "hours", channel: "email", templateId: null, couponId: null, uniqueCodes: false };

function delayText(hours: number) {
  return hours % 24 === 0 ? `${hours / 24} يوم` : `${hours} ساعة`;
}

export function AutomationsBoard({
  locale,
  rows,
  templates,
  coupons,
  canEdit,
  cronReady,
}: {
  locale: string;
  rows: AutomationRow[];
  templates: { id: string; name: string; channel: Channel }[];
  coupons: { id: string; code: string }[];
  canEdit: boolean;
  cronReady: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const choices = templates.filter((template) => template.channel === draft.channel);

  function run(task: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "تعذر الحفظ.");
      else {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {!cronReady ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          الرسائل التلقائية تعمل حين تنادي مهمة مجدولة على الخادم /api/cron/marketing كل دقيقة. CRON_SECRET غير مضبوط بعد.
        </p>
      ) : null}
      {error ? <AdminError>{error}</AdminError> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-3">
          {rows.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد قواعد. كل قاعدة تبدأ متوقفة حتى تفعّلها.</p> : null}
          {rows.map((row) => (
            <div key={row.id} className={cn("rounded-xl border p-4", draft.id === row.id && "border-primary")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {triggerLabels[row.trigger]?.title} · بعد {delayText(row.delayHours)} · {channelLabels[row.channel]} · {row.templateName ?? "القالب حُذف"}
                    {row.couponCode ? ` · ${row.couponCode}${row.uniqueCodes ? " فردي" : ""}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    أُرسل {row.sent} · انتظار {row.pending} · فشل {row.failed} · تُرك {row.skipped} · نقر {row.clicks}
                    {row.lastRunAt ? ` · آخر فحص ${marketingDate(row.lastRunAt)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" disabled={!canEdit || pending} onClick={() => run(() => adminSetAutomationActive(locale, row.id, !row.active))}>
                    <Pill tone={row.active ? "success" : "neutral"} dot>{row.active ? "مفعّلة" : "متوقفة"}</Pill>
                  </button>
                  <button
                    type="button"
                    className={cn(adminGhostClass, "h-8 px-3 text-xs")}
                    disabled={!canEdit}
                    onClick={() =>
                      setDraft({
                        id: row.id,
                        name: row.name,
                        trigger: row.trigger,
                        amount: row.delayHours % 24 === 0 ? row.delayHours / 24 : row.delayHours,
                        unit: row.delayHours % 24 === 0 ? "days" : "hours",
                        channel: row.channel,
                        templateId: row.templateId,
                        couponId: row.couponId,
                        uniqueCodes: row.uniqueCodes,
                      })
                    }
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    className={cn(adminDangerClass, "h-8 px-3 text-xs")}
                    disabled={!canEdit || pending}
                    onClick={() => {
                      if (window.confirm(`حذف القاعدة «${row.name}» وسجل رسائلها؟`)) run(() => adminDeleteAutomation(locale, row.id), () => setDraft(blank));
                    }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <form
          className="space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () =>
                adminSaveAutomation(locale, {
                  id: draft.id,
                  name: draft.name,
                  trigger: draft.trigger,
                  delayHours: draft.unit === "days" ? draft.amount * 24 : draft.amount,
                  channel: draft.channel,
                  templateId: draft.templateId,
                  couponId: draft.couponId,
                  uniqueCodes: draft.uniqueCodes,
                }),
              () => setDraft(blank),
            );
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{draft.id ? "تعديل القاعدة" : "قاعدة جديدة"}</h2>
            {draft.id ? <button type="button" className="text-xs text-muted-foreground" onClick={() => setDraft(blank)}>جديدة</button> : null}
          </div>
          <label className="block text-sm">
            الاسم
            <input value={draft.name} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="تذكير بإكمال الطلب" className={adminInputClass} />
          </label>
          <label className="block text-sm">
            المحفّز
            <select value={draft.trigger} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, trigger: event.target.value as Draft["trigger"] })} className={adminSelectClass}>
              {Object.entries(triggerLabels).map(([id, label]) => <option key={id} value={id}>{label.title}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">{triggerLabels[draft.trigger]?.hint}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              بعد
              <input type="number" min={1} dir="ltr" value={draft.amount} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} className={adminInputClass} />
            </label>
            <label className="block text-sm">
              الوحدة
              <select value={draft.unit} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, unit: event.target.value as Draft["unit"] })} className={adminSelectClass}>
                <option value="hours">ساعة</option>
                <option value="days">يوم</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            القناة
            <select value={draft.channel} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, channel: event.target.value as Channel, templateId: null })} className={adminSelectClass}>
              {(Object.keys(channelLabels) as Channel[]).map((channel) => <option key={channel} value={channel}>{channelLabels[channel]}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            القالب
            <select value={draft.templateId ?? ""} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, templateId: event.target.value || null })} className={adminSelectClass}>
              <option value="">اختر قالباً</option>
              {choices.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            {choices.length === 0 ? <span className="mt-1 block text-xs text-muted-foreground">أنشئ قالباً لهذه القناة من صفحة القوالب.</span> : null}
          </label>
          <label className="block text-sm">
            كوبون
            <select value={draft.couponId ?? ""} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, couponId: event.target.value || null })} className={adminSelectClass}>
              <option value="">بدون خصم</option>
              {coupons.map((coupon) => <option key={coupon.id} value={coupon.id}>{coupon.code}</option>)}
            </select>
          </label>
          {draft.couponId ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.uniqueCodes} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, uniqueCodes: event.target.checked })} />
              رمز فردي لكل رسالة
            </label>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">كل حدث يأخذ رسالة واحدة فقط. الأحداث الأقدم من المدة بأسبوعين لا تُرسل، فتفعيل قاعدة لا يراسل التاريخ القديم. حد الرسائل وساعات الهدوء يسريان هنا.</p>
          <button type="submit" className={adminPrimaryClass} disabled={!canEdit || pending}>حفظ</button>
        </form>
      </div>
    </div>
  );
}
