"use client";

import { useEffect, useState } from "react";
import { adminSetDocumentStatus } from "@/app/actions/admin";
import { AdminEmpty, Bar, Pill, adminTextareaClass } from "@/components/admin/chrome";
import { relativeTime } from "@/components/admin/format";
import { docLabel } from "@/lib/localize";
import type { ApplicationDocument, Traveler } from "@/lib/types";
import { cn } from "@/lib/utils";
import { documentStatusLabel, documentStatusTone, fileHref, fileSize, isImage, isPdf } from "./model";
import { FeedbackLine, useRun } from "./use-run";

const presets = [
  { label: "غير واضحة", text: "الصورة غير واضحة أو مهتزة. أعد تصوير المستند في إضاءة جيدة وبدون انعكاس." },
  { label: "مقصوصة", text: "المستند مقصوص ولا تظهر كل حوافه. صوّر الصفحة كاملة." },
  { label: "منتهي الصلاحية", text: "المستند منتهي الصلاحية. ارفع نسخة سارية." },
  { label: "الاسم لا يطابق", text: "الاسم في المستند لا يطابق الاسم في جواز السفر." },
  { label: "مستند خاطئ", text: "هذا ليس المستند المطلوب. راجع وصف المستند وارفع الصحيح." },
  { label: "مواصفات الصورة", text: "الصورة الشخصية لا تطابق المواصفات: خلفية بيضاء، وجه واضح، بدون نظارة." },
];

type Slot = { kind: string; doc: ApplicationDocument | null };

export function DocumentReview({
  locale,
  applicationId,
  documents,
  travelers,
  required,
  now,
}: {
  locale: string;
  applicationId: string;
  documents: ApplicationDocument[];
  travelers: Traveler[];
  required: string[];
  now: string;
}) {
  const kinds = required.length ? required : ["passport"];
  const [preview, setPreview] = useState<ApplicationDocument | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { pending, run, feedback } = useRun();

  const travelerIds = new Set(travelers.map((traveler) => traveler.id));
  const groups = travelers.map((traveler) => {
    const own = documents.filter((doc) => doc.travelerId === traveler.id);
    const slots: Slot[] = kinds.map((kind) => ({ kind, doc: own.find((doc) => doc.kind === kind) ?? null }));
    for (const doc of own) if (!kinds.includes(doc.kind)) slots.push({ kind: doc.kind, doc });
    return { traveler, slots };
  });
  const loose = documents.filter((doc) => !doc.travelerId || !travelerIds.has(doc.travelerId));

  const counts = {
    verified: documents.filter((doc) => doc.status === "verified").length,
    uploaded: documents.filter((doc) => doc.status === "uploaded").length,
    rejected: documents.filter((doc) => doc.status === "rejected").length,
    missing: groups.reduce((sum, group) => sum + group.slots.filter((slot) => !slot.doc).length, 0),
  };
  const requiredTotal = travelers.length * kinds.length;
  const requiredVerified = groups.reduce((sum, group) => sum + group.slots.filter((slot) => kinds.includes(slot.kind) && slot.doc?.status === "verified").length, 0);

  const approve = (doc: ApplicationDocument) => {
    setBusy(doc.id);
    run(() => adminSetDocumentStatus(locale, applicationId, doc.id, "verified"), `اعتُمد «${docLabel(doc.kind, "ar-EG")}».`, () => setPreview(null));
  };
  const reject = (doc: ApplicationDocument, reason: string) => {
    setBusy(doc.id);
    run(() => adminSetDocumentStatus(locale, applicationId, doc.id, "rejected", reason.trim()), "رُفض المستند وأُبلغ العميل بالسبب.", () => setRejecting(null));
  };

  if (!documents.length && !travelers.length) {
    return <AdminEmpty title="لا توجد مستندات">لم يُضف العميل مسافرين أو مستندات بعد.</AdminEmpty>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="success" dot>
              {counts.verified} معتمد
            </Pill>
            <Pill tone={counts.uploaded ? "warning" : "neutral"} dot>
              {counts.uploaded} بانتظار المراجعة
            </Pill>
            <Pill tone={counts.rejected ? "danger" : "neutral"} dot>
              {counts.rejected} مرفوض
            </Pill>
            {counts.missing ? <Pill tone="neutral">{counts.missing} لم يُرفع</Pill> : null}
          </div>
          {requiredTotal ? (
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              {requiredVerified}/{requiredTotal} <span className="font-sans">مطلوب معتمد</span>
            </p>
          ) : null}
        </div>
        {requiredTotal ? (
          <div className="mt-3">
            <Bar value={requiredVerified} max={requiredTotal} tone={requiredVerified === requiredTotal ? "success" : "info"} />
          </div>
        ) : null}
        <FeedbackLine feedback={feedback} className="mt-3" />
      </div>

      {groups.map(({ traveler, slots }, index) => {
        const done = slots.filter((slot) => slot.doc?.status === "verified").length;
        return (
          <section key={traveler.id} className="overflow-hidden rounded-xl border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{`${traveler.firstName} ${traveler.lastName}`.trim() || "مسافر بدون اسم"}</p>
                  {traveler.passportNumber ? (
                    <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                      {traveler.passportNumber}
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {done}/{slots.length} <span className="font-sans">معتمد</span>
              </span>
            </header>
            <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
              {slots.map((slot) =>
                slot.doc ? (
                  <DocumentCard
                    key={slot.doc.id}
                    doc={slot.doc}
                    now={now}
                    busy={pending && busy === slot.doc.id}
                    disabled={pending}
                    rejecting={rejecting === slot.doc.id}
                    onPreview={() => setPreview(slot.doc)}
                    onApprove={() => approve(slot.doc!)}
                    onStartReject={() => setRejecting(slot.doc!.id)}
                    onCancelReject={() => setRejecting(null)}
                    onReject={(reason) => reject(slot.doc!, reason)}
                  />
                ) : (
                  <div key={slot.kind} className="flex min-h-[132px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center">
                    <p className="text-sm font-medium text-muted-foreground">{docLabel(slot.kind, "ar-EG")}</p>
                    <p className="text-xs text-muted-foreground/70">لم يرفعه العميل بعد</p>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}

      {loose.length ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          <header className="border-b px-5 py-3">
            <p className="text-sm font-semibold">مستندات غير مرتبطة بمسافر</p>
          </header>
          <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
            {loose.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                now={now}
                busy={pending && busy === doc.id}
                disabled={pending}
                rejecting={rejecting === doc.id}
                onPreview={() => setPreview(doc)}
                onApprove={() => approve(doc)}
                onStartReject={() => setRejecting(doc.id)}
                onCancelReject={() => setRejecting(null)}
                onReject={(reason) => reject(doc, reason)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {preview ? (
        <Lightbox
          doc={preview}
          disabled={pending}
          onClose={() => setPreview(null)}
          onApprove={() => approve(preview)}
          onReject={() => {
            setRejecting(preview.id);
            setPreview(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Thumb({ doc, onPreview }: { doc: ApplicationDocument; onPreview: () => void }) {
  const [broken, setBroken] = useState(false);
  const image = isImage(doc) && !broken;
  return (
    <button
      type="button"
      onClick={onPreview}
      className="group relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-md border bg-[#0a0d14] bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.12)_1px,transparent_0)] [background-size:12px_12px]"
      aria-label={`معاينة ${doc.fileName}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileHref(doc.storagePath)} alt="" loading="lazy" onError={() => setBroken(true)} className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <span className="flex flex-col items-center gap-2 text-muted-foreground">
          <svg viewBox="0 0 24 24" aria-hidden className="size-8 fill-none stroke-current" strokeWidth="1.4">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
            <path d="M14 3v5h5" strokeLinejoin="round" />
          </svg>
          <span className="font-mono text-[11px] tracking-wider">{isPdf(doc) ? "PDF" : broken ? "تعذر العرض" : "ملف"}</span>
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-start text-[11px] text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
        معاينة
      </span>
    </button>
  );
}

function DocumentCard({
  doc,
  now,
  busy,
  disabled,
  rejecting,
  onPreview,
  onApprove,
  onStartReject,
  onCancelReject,
  onReject,
}: {
  doc: ApplicationDocument;
  now: string;
  busy: boolean;
  disabled: boolean;
  rejecting: boolean;
  onPreview: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onReject: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-background/40 p-3 transition-colors",
        doc.status === "uploaded" && "border-amber-400/40",
        doc.status === "rejected" && "border-rose-500/40",
        busy && "opacity-60",
      )}
    >
      <Thumb doc={doc} onPreview={onPreview} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium">{docLabel(doc.kind, "ar-EG")}</p>
          <Pill tone={documentStatusTone[doc.status] ?? "neutral"} dot>
            {documentStatusLabel[doc.status] ?? doc.status}
          </Pill>
        </div>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate" dir="ltr">
            {doc.fileName}
          </span>
          {doc.sizeBytes ? (
            <>
              <span className="size-0.5 shrink-0 rounded-full bg-muted-foreground/60" />
              <span className="shrink-0 font-mono">{fileSize(doc.sizeBytes)}</span>
            </>
          ) : null}
          <span className="size-0.5 shrink-0 rounded-full bg-muted-foreground/60" />
          <span className="shrink-0">{relativeTime(doc.createdAt, new Date(now))}</span>
        </p>
        {doc.status === "rejected" && doc.rejectReason ? (
          <p className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/[0.06] px-2.5 py-1.5 text-xs leading-relaxed text-rose-200">{doc.rejectReason}</p>
        ) : null}
      </div>

      {rejecting ? (
        <div className="space-y-2 rounded-md border border-rose-500/30 bg-rose-500/[0.04] p-2.5">
          <p className="text-xs font-medium text-rose-200">سبب الرفض يصل للعميل كما تكتبه</p>
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setReason(preset.text)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                  reason === preset.text ? "border-rose-400/60 bg-rose-500/15 text-rose-100" : "border-border text-muted-foreground hover:border-rose-400/40 hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            autoFocus
            placeholder="اختر سبباً جاهزاً أو اكتب السبب"
            className={cn(adminTextareaClass, "mt-0 text-xs")}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || !reason.trim()}
              onClick={() => onReject(reason)}
              className="inline-flex h-8 items-center rounded-md bg-rose-500 px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              رفض وإبلاغ العميل
            </button>
            <button type="button" onClick={onCancelReject} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex items-center gap-2">
          {doc.status !== "verified" ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onApprove}
              className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {busy ? "جارٍ…" : "قبول"}
            </button>
          ) : null}
          {doc.status !== "rejected" ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onStartReject}
              className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-input px-3 text-xs text-muted-foreground transition-colors hover:border-rose-500/50 hover:text-rose-200 disabled:opacity-40"
            >
              رفض…
            </button>
          ) : (
            <span className="flex-1 text-center text-[11px] text-muted-foreground">بانتظار بديل من العميل</span>
          )}
          <a href={fileHref(doc.storagePath)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground">
            فتح
          </a>
        </div>
      )}
    </article>
  );
}

function Lightbox({
  doc,
  disabled,
  onClose,
  onApprove,
  onReject,
}: {
  doc: ApplicationDocument;
  disabled: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const src = fileHref(doc.storagePath);
  return (
    <div role="dialog" aria-modal="true" aria-label={doc.fileName} className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0f131c] px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{docLabel(doc.kind, "ar-EG")}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">
            {doc.fileName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={documentStatusTone[doc.status] ?? "neutral"} dot>
            {documentStatusLabel[doc.status] ?? doc.status}
          </Pill>
          {doc.status !== "verified" ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onApprove}
              className="inline-flex h-8 items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              قبول
            </button>
          ) : null}
          {doc.status !== "rejected" ? (
            <button type="button" onClick={onReject} className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs hover:border-rose-500/50 hover:text-rose-200">
              رفض…
            </button>
          ) : null}
          <a href={src} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs hover:border-primary/50">
            فتح في تبويب
          </a>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:border-primary/50">
            <svg viewBox="0 0 12 12" aria-hidden className="size-3 fill-none stroke-current" strokeWidth="1.6">
              <path d="m2.5 2.5 7 7m0-7-7 7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {isImage(doc) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={doc.fileName} className="max-h-full max-w-full rounded-md object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        ) : isPdf(doc) ? (
          <iframe title={doc.fileName} src={src} className="h-full w-full max-w-4xl rounded-md bg-[#ffffff]" onClick={(event) => event.stopPropagation()} />
        ) : (
          <p className="text-sm text-muted-foreground">لا تتوفر معاينة لهذا النوع. افتحه في تبويب جديد.</p>
        )}
      </div>
    </div>
  );
}
