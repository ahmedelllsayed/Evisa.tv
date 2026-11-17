"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteTemplate, adminSaveTemplate, adminSendTest } from "@/app/actions/marketing";
import { AdminError, Pill, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import type { Channel } from "@/lib/marketing/audience";
import { channelLabels } from "@/lib/marketing/labels";
import { emptyContent, type MessageContent } from "@/lib/marketing/render";
import { cn } from "@/lib/utils";
import { ContentFields } from "./content-fields";

export type TemplateRow = { id: string; name: string; channel: Channel; content: MessageContent };

type Draft = { id: string | null; name: string; channel: Channel; content: MessageContent };

const blank: Draft = { id: null, name: "", channel: "email", content: emptyContent };

export function TemplatesBoard({ locale, templates, canEdit }: { locale: string; templates: TemplateRow[]; canEdit: boolean }) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(task: () => Promise<{ ok: boolean; error?: string; id?: string }>, done?: string) {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "تعذر الحفظ.");
        return;
      }
      if (result.id) setDraft((current) => ({ ...current, id: result.id ?? current.id }));
      if (done) setNotice(done);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-2">
        <button type="button" className={cn(adminGhostClass, "w-full")} onClick={() => setDraft(blank)}>قالب جديد</button>
        {templates.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">لا توجد قوالب.</p> : null}
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              setDraft({ id: template.id, name: template.name, channel: template.channel, content: template.content });
              setError(null);
              setNotice(null);
            }}
            className={cn("block w-full rounded-lg border p-3 text-start", draft.id === template.id && "border-primary")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{template.name}</span>
              <Pill>{channelLabels[template.channel]}</Pill>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.channel === "whatsapp" ? template.content.waName : template.content.subject ?? template.content.body}</p>
          </button>
        ))}
      </div>
      <form
        className="space-y-4 rounded-xl border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => adminSaveTemplate(locale, draft), "حُفظ القالب.");
        }}
      >
        {error ? <AdminError>{error}</AdminError> : null}
        {notice ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <label className="block text-sm">
            اسم القالب
            <input value={draft.name} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            القناة
            <select value={draft.channel} disabled={!canEdit || Boolean(draft.id)} onChange={(event) => setDraft({ ...draft, channel: event.target.value as Channel })} className={adminSelectClass}>
              {(Object.keys(channelLabels) as Channel[]).map((channel) => <option key={channel} value={channel}>{channelLabels[channel]}</option>)}
            </select>
          </label>
        </div>
        <ContentFields channel={draft.channel} content={draft.content} disabled={!canEdit} onChange={(content) => setDraft({ ...draft, content })} />
        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <button type="submit" className={adminPrimaryClass} disabled={!canEdit || pending}>حفظ</button>
          <label className="block text-sm">
            رسالة تجربة إلى
            <input dir="ltr" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder={draft.channel === "email" ? "you@example.com" : "010…"} className={cn(adminInputClass, "w-56")} />
          </label>
          <button
            type="button"
            className={adminGhostClass}
            disabled={!canEdit || pending || !testTo.trim()}
            onClick={() => run(() => adminSendTest(locale, { channel: draft.channel, address: testTo, content: draft.content, couponCode: "TEST-CODE" }), "أُرسلت رسالة التجربة.")}
          >
            أرسل تجربة
          </button>
          {draft.id ? (
            <button
              type="button"
              className={cn(adminDangerClass, "ms-auto")}
              disabled={!canEdit || pending}
              onClick={() => {
                if (!draft.id || !window.confirm(`حذف القالب «${draft.name}»؟ القواعد التلقائية المرتبطة به تتوقف عن الإرسال.`)) return;
                const id = draft.id;
                run(async () => {
                  const result = await adminDeleteTemplate(locale, id);
                  if (result.ok) setDraft(blank);
                  return result;
                });
              }}
            >
              حذف
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
