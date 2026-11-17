"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteSegment, adminPreviewAudience, adminSaveSegment } from "@/app/actions/marketing";
import { AdminError, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { describeFilter, emptyFilter, type AudienceFilter } from "@/lib/marketing/audience";
import { cn } from "@/lib/utils";
import { AudienceEditor, type AudienceOptions } from "./audience-editor";
import { AudiencePreview, type AudiencePreviewData } from "./audience-preview";

export type SegmentRow = { id: string; name: string; filter: AudienceFilter; campaigns: number; coupons: number };

export function SegmentsBoard({ locale, segments, options, canEdit }: { locale: string; segments: SegmentRow[]; options: AudienceOptions; canEdit: boolean }) {
  const [draft, setDraft] = useState<{ id: string | null; name: string; filter: AudienceFilter }>({ id: null, name: "", filter: emptyFilter });
  const [preview, setPreview] = useState<AudiencePreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const names = {
    lists: Object.fromEntries(options.lists.map((list) => [list.id, list.name])),
    destinations: Object.fromEntries(options.destinations.map((destination) => [destination.id, destination.name])),
  };

  function edit(next: typeof draft) {
    setDraft(next);
    setPreview(null);
    setError(null);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-2">
        <button type="button" className={cn(adminGhostClass, "w-full")} onClick={() => edit({ id: null, name: "", filter: emptyFilter })}>شريحة جديدة</button>
        {segments.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">لا توجد شرائح.</p> : null}
        {segments.map((segment) => (
          <div key={segment.id} className={cn("rounded-lg border p-3", draft.id === segment.id && "border-primary")}>
            <button type="button" className="w-full text-start" onClick={() => edit({ id: segment.id, name: segment.name, filter: segment.filter })}>
              <p className="font-medium">{segment.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{describeFilter(segment.filter, names)}</p>
              {segment.campaigns || segment.coupons ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {segment.campaigns ? `حملات ${segment.campaigns}` : ""}
                  {segment.campaigns && segment.coupons ? " · " : ""}
                  {segment.coupons ? `كوبونات ${segment.coupons}` : ""}
                </p>
              ) : null}
            </button>
          </div>
        ))}
      </div>
      <form
        className="space-y-4 rounded-xl border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          start(async () => {
            const result = await adminSaveSegment(locale, draft);
            if (!result.ok) setError(result.error);
            else {
              setDraft((current) => ({ ...current, id: result.id }));
              router.refresh();
            }
          });
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block min-w-60 flex-1 text-sm">
            اسم الشريحة
            <input value={draft.name} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="مثلاً: عملاء متكررون لتأشيرة إلكترونية" className={adminInputClass} />
          </label>
          {draft.id ? (
            <button
              type="button"
              className={adminDangerClass}
              disabled={!canEdit || pending}
              onClick={() => {
                if (!draft.id || !window.confirm(`حذف الشريحة «${draft.name}»؟ الكوبونات المرتبطة بها تصبح لكل العملاء.`)) return;
                start(async () => {
                  const result = await adminDeleteSegment(locale, draft.id!);
                  if (!result.ok) setError(result.error);
                  else {
                    edit({ id: null, name: "", filter: emptyFilter });
                    router.refresh();
                  }
                });
              }}
            >
              حذف
            </button>
          ) : null}
        </div>
        {error ? <AdminError>{error}</AdminError> : null}
        <AudienceEditor filter={draft.filter} disabled={!canEdit} options={options} onChange={(filter) => { setDraft({ ...draft, filter }); setPreview(null); }} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={adminGhostClass}
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const result = await adminPreviewAudience(locale, { channel: null, segmentId: null, filter: draft.filter });
                if (!result.ok) setError(result.error);
                else setPreview(result);
              });
            }}
          >
            اعرض المطابقين
          </button>
          <button type="submit" className={adminPrimaryClass} disabled={!canEdit || pending}>{draft.id ? "حفظ التعديل" : "حفظ الشريحة"}</button>
        </div>
        {preview ? <AudiencePreview preview={preview} /> : null}
      </form>
    </div>
  );
}
