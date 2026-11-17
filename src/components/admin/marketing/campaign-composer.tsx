"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCampaignAction, adminPreviewAudience, adminSaveCampaign, adminScheduleCampaign, adminSendTest, adminStartCampaign } from "@/app/actions/marketing";
import { AdminError, AdminPanel, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import { href } from "@/lib/href";
import type { AudienceFilter, Channel } from "@/lib/marketing/audience";
import { channelLabels } from "@/lib/marketing/labels";
import type { MessageContent } from "@/lib/marketing/render";
import { cn } from "@/lib/utils";
import { AudienceEditor, type AudienceOptions } from "./audience-editor";
import { AudiencePreview, type AudiencePreviewData } from "./audience-preview";
import { ContentFields } from "./content-fields";

export type CampaignDraft = {
  id: string | null;
  name: string;
  channel: Channel;
  segmentId: string | null;
  filter: AudienceFilter;
  excluded: string[];
  templateId: string | null;
  content: MessageContent;
  couponId: string | null;
  uniqueCodes: boolean;
  linkUrl: string | null;
  scheduledLocal: string | null;
};

export function CampaignComposer({
  locale,
  initial,
  options,
  segments,
  templates,
  coupons,
  channelReady,
  canEdit,
}: {
  locale: string;
  initial: CampaignDraft;
  options: AudienceOptions;
  segments: { id: string; name: string }[];
  templates: { id: string; name: string; channel: Channel; content: MessageContent }[];
  coupons: { id: string; code: string; active: boolean }[];
  channelReady: Record<Channel, string | null>;
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<CampaignDraft>(initial);
  const [preview, setPreview] = useState<AudiencePreviewData | null>(null);
  const [testTo, setTestTo] = useState("");
  const [when, setWhen] = useState(initial.scheduledLocal ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const channelTemplates = templates.filter((template) => template.channel === draft.channel);
  const coupon = coupons.find((item) => item.id === draft.couponId) ?? null;
  const problem = channelReady[draft.channel];

  function set<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function changeAudience(next: Partial<CampaignDraft>) {
    setDraft((current) => ({ ...current, ...next, excluded: [] }));
    setPreview(null);
  }

  async function persist() {
    const result = await adminSaveCampaign(locale, {
      id: draft.id,
      name: draft.name,
      channel: draft.channel,
      segmentId: draft.segmentId,
      filter: draft.filter,
      excluded: draft.excluded,
      templateId: draft.templateId,
      content: draft.content,
      couponId: draft.couponId,
      uniqueCodes: draft.uniqueCodes,
      linkUrl: draft.linkUrl,
    });
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    if (!draft.id) {
      setDraft((current) => ({ ...current, id: result.id }));
      window.history.replaceState(null, "", href(`/admin/marketing/campaigns/${result.id}`, locale));
    }
    return result.id;
  }

  function run(task: () => Promise<void>) {
    setError(null);
    setNotice(null);
    start(task);
  }

  return (
    <div className="space-y-5">
      {error ? <AdminError>{error}</AdminError> : null}
      {notice ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
      {problem ? <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">{problem} يمكنك حفظ المسودة الآن.</p> : null}

      <AdminPanel title="الحملة">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block text-sm">
            اسم الحملة
            <input value={draft.name} disabled={!canEdit} onChange={(event) => set("name", event.target.value)} placeholder="مثلاً: عرض الصيف للعملاء المتكررين" className={adminInputClass} />
          </label>
          <label className="block text-sm">
            القناة
            <select
              value={draft.channel}
              disabled={!canEdit}
              onChange={(event) => {
                changeAudience({ channel: event.target.value as Channel, templateId: null });
              }}
              className={adminSelectClass}
            >
              {(Object.keys(channelLabels) as Channel[]).map((channel) => <option key={channel} value={channel}>{channelLabels[channel]}</option>)}
            </select>
          </label>
        </div>
      </AdminPanel>

      <AdminPanel title="الجمهور" hint="الشريحة تُحسب لحظة الإرسال. يمكنك استبعاد أشخاص من العينة.">
        <label className="block max-w-md text-sm">
          الشريحة
          <select value={draft.segmentId ?? ""} disabled={!canEdit} onChange={(event) => changeAudience({ segmentId: event.target.value || null })} className={adminSelectClass}>
            <option value="">فلتر لهذه الحملة</option>
            {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}
          </select>
        </label>
        {draft.segmentId ? null : (
          <div className="mt-4">
            <AudienceEditor filter={draft.filter} options={options} disabled={!canEdit} onChange={(filter) => changeAudience({ filter })} />
          </div>
        )}
        <button
          type="button"
          className={cn(adminGhostClass, "mt-4")}
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await adminPreviewAudience(locale, { channel: draft.channel, segmentId: draft.segmentId, filter: draft.filter });
              if (!result.ok) setError(result.error);
              else setPreview(result);
            })
          }
        >
          اعرض المطابقين على {channelLabels[draft.channel]}
        </button>
        {preview ? (
          <AudiencePreview
            preview={preview}
            excluded={draft.excluded}
            onToggle={(id, include) => set("excluded", include ? draft.excluded.filter((item) => item !== id) : [...draft.excluded, id])}
          />
        ) : null}
      </AdminPanel>

      <AdminPanel title="الرسالة">
        <label className="block max-w-md text-sm">
          ابدأ من قالب
          <select
            value={draft.templateId ?? ""}
            disabled={!canEdit}
            onChange={(event) => {
              const template = channelTemplates.find((item) => item.id === event.target.value);
              setDraft((current) => ({ ...current, templateId: template?.id ?? null, content: template ? template.content : current.content }));
            }}
            className={adminSelectClass}
          >
            <option value="">بدون قالب</option>
            {channelTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        <div className="mt-4">
          <ContentFields channel={draft.channel} content={draft.content} disabled={!canEdit} onChange={(content) => set("content", content)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            كوبون
            <select value={draft.couponId ?? ""} disabled={!canEdit} onChange={(event) => set("couponId", event.target.value || null)} className={adminSelectClass}>
              <option value="">بدون خصم</option>
              {coupons.map((item) => <option key={item.id} value={item.id}>{item.code}{item.active ? "" : " · متوقف"}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            رابط الحملة
            <input dir="ltr" value={draft.linkUrl ?? ""} disabled={!canEdit} onChange={(event) => set("linkUrl", event.target.value || null)} placeholder="/ar-EG/visa/turkey أو اتركه للرئيسية" className={adminInputClass} />
          </label>
        </div>
        {draft.couponId ? (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.uniqueCodes} disabled={!canEdit} onChange={(event) => set("uniqueCodes", event.target.checked)} />
            رمز فردي لكل مستلم يُستخدم مرة واحدة، بشروط {coupon?.code}
          </label>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">الرابط يمر على صفحة تتبع ثم يفتح الموقع، ويطبّق الكوبون تلقائياً عند الدفع.</p>
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
          <label className="block text-sm">
            رسالة تجربة إلى
            <input dir="ltr" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder={draft.channel === "email" ? "you@example.com" : "010…"} className={cn(adminInputClass, "w-56")} />
          </label>
          <button
            type="button"
            className={adminGhostClass}
            disabled={!canEdit || pending || !testTo.trim()}
            onClick={() =>
              run(async () => {
                const result = await adminSendTest(locale, { channel: draft.channel, address: testTo, content: draft.content, couponCode: coupon?.code ?? null });
                if (!result.ok) setError(result.error);
                else setNotice("أُرسلت رسالة التجربة.");
              })
            }
          >
            أرسل تجربة
          </button>
        </div>
      </AdminPanel>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-end gap-2 rounded-xl border bg-card/95 p-4 backdrop-blur">
        <button
          type="button"
          className={adminGhostClass}
          disabled={!canEdit || pending}
          onClick={() =>
            run(async () => {
              if (await persist()) {
                setNotice("حُفظت المسودة.");
                router.refresh();
              }
            })
          }
        >
          حفظ كمسودة
        </button>
        <label className="block text-sm">
          موعد بتوقيت القاهرة
          <input type="datetime-local" dir="ltr" value={when} disabled={!canEdit} onChange={(event) => setWhen(event.target.value)} className={cn(adminInputClass, "w-56")} />
        </label>
        <button
          type="button"
          className={adminGhostClass}
          disabled={!canEdit || pending || !when}
          onClick={() =>
            run(async () => {
              const id = await persist();
              if (!id) return;
              const result = await adminScheduleCampaign(locale, id, when);
              if (!result.ok) setError(result.error);
              else {
                setNotice("جُدولت الحملة. تحتاج مهمة الجدولة على الخادم لتبدأ في موعدها.");
                router.refresh();
              }
            })
          }
        >
          جدولة
        </button>
        {initial.scheduledLocal && draft.id ? (
          <button
            type="button"
            className={adminGhostClass}
            disabled={!canEdit || pending}
            onClick={() =>
              run(async () => {
                if (!draft.id) return;
                await adminCampaignAction(locale, draft.id, "unschedule");
                setWhen("");
                router.refresh();
              })
            }
          >
            إلغاء الموعد
          </button>
        ) : null}
        <button
          type="button"
          className={cn(adminPrimaryClass, "ms-auto")}
          disabled={!canEdit || pending || Boolean(problem)}
          onClick={() =>
            run(async () => {
              const count = preview ? preview.total - draft.excluded.length : null;
              if (!window.confirm(count != null ? `إرسال «${draft.name}» إلى ${count} شخص الآن؟` : `إرسال «${draft.name}» الآن؟ اعرض المطابقين أولاً لترى العدد.`)) return;
              const id = await persist();
              if (!id) return;
              const result = await adminStartCampaign(locale, id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push(href(`/admin/marketing/campaigns/${id}`, locale));
              router.refresh();
            })
          }
        >
          {pending ? "لحظة…" : "أرسل الآن"}
        </button>
      </div>
    </div>
  );
}
