"use client";

import { FileText, ImageUp, LoaderCircle, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { deleteProfileDocumentAction, uploadProfileDocumentAction } from "@/app/actions/profile";
import { bytes, Card, fileHref, Pill, quietButton, say, SectionTitle } from "@/components/account/ui";
import { t } from "@/lib/i18n";
import { docHint, docLabel } from "@/lib/localize";
import { profileDocumentKinds, type ProfileDocument } from "@/lib/profile";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const allowedExtensions = /\.(jpe?g|png|webp|pdf)$/i;
const requiredKinds = new Set(["passport", "photo"]);

export function docTargetId(kind: string) {
  return `profile-doc-${kind.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function fileProblem(file: File, locale: string) {
  if (!file.size) return say(locale, "This file is empty.", "هذا الملف فارغ.");
  if (file.size > MAX_BYTES) return t(locale, "err.fileSize");
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return t(locale, "err.fileHeic");
  if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) return t(locale, "err.fileType");
  return null;
}

export function ProfileDocuments({ locale, documents, onNotice }: { locale: string; documents: ProfileDocument[]; onNotice: (text: string) => void }) {
  const saved = new Map(documents.map((doc) => [doc.kind, doc]));
  const standard: readonly string[] = profileDocumentKinds;
  const kinds = [...standard, ...documents.map((doc) => doc.kind).filter((kind) => !standard.includes(kind))];
  const count = kinds.filter((kind) => saved.has(kind)).length;

  return (
    <Card id="profile-documents" className="p-5 sm:p-6">
      <SectionTitle
        title={t(locale, "profile.documents")}
        hint={say(locale, "Upload each file once. New applications attach them for you.", "ارفع كل ملف مرة واحدة، وسنرفقه تلقائياً في طلباتك الجديدة.")}
        action={
          <Pill tone={count === kinds.length ? "green" : "slate"}>
            <span dir="ltr" className="tabular-nums">
              {count}/{kinds.length}
            </span>
          </Pill>
        }
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {kinds.map((kind) => (
          <DocumentCard key={kind} locale={locale} kind={kind} doc={saved.get(kind) ?? null} onNotice={onNotice} />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-ink">{say(locale, "JPG, PNG, WebP or PDF, up to 10 MB each.", "JPG أو PNG أو WebP أو PDF، بحد أقصى 10 ميغابايت للملف.")}</p>
    </Card>
  );
}

function DocumentCard({ locale, kind, doc, onNotice }: { locale: string; kind: string; doc: ProfileDocument | null; onNotice: (text: string) => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [task, setTask] = useState<"upload" | "remove">("upload");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState(false);
  const label = docLabel(kind, locale);
  const canUpload = kind !== "issued_visa";
  const isImage = Boolean(doc?.mimeType?.startsWith("image/"));
  const targetId = docTargetId(kind);

  function upload(file: File) {
    const problem = fileProblem(file, locale);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setConfirming(false);
    setTask("upload");
    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("kind", kind);
    fd.set("file", file);
    start(async () => {
      const result = await uploadProfileDocumentAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onNotice(say(locale, `${label} saved to your profile.`, `حُفظ ملف «${label}» في ملفك.`));
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    setTask("remove");
    start(async () => {
      const result = await deleteProfileDocumentAction(locale, kind);
      setConfirming(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onNotice(say(locale, `${label} removed.`, `حُذف ملف «${label}».`));
      router.refresh();
    });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && canUpload && !pending) upload(file);
  }

  return (
    <div
      data-doc-kind={kind}
      className={cn(
        "relative flex min-w-0 flex-col rounded-2xl border bg-white p-3 transition-colors",
        dragging ? "border-brand ring-2 ring-brand/15" : error ? "border-rose-200" : "border-[#e3e5f2]",
      )}
      onDragOver={(event) => {
        if (!canUpload) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="flex min-w-0 items-start justify-between gap-2 px-1 pt-0.5">
        <p className="min-w-0 truncate text-sm font-semibold text-[#16182b]">{label}</p>
        {doc ? (
          <Pill tone="green" dot>
            {say(locale, "Saved", "محفوظ")}
          </Pill>
        ) : requiredKinds.has(kind) ? (
          <Pill tone="amber">{say(locale, "Required", "مطلوب")}</Pill>
        ) : (
          <Pill>{say(locale, "Optional", "اختياري")}</Pill>
        )}
      </div>

      <div className="mt-3">
        {doc ? (
          <a
            href={fileHref(doc.storagePath)}
            target="_blank"
            rel="noreferrer"
            className="group relative block h-32 overflow-hidden rounded-xl bg-surface ring-1 ring-inset ring-[#eceef6]"
            title={say(locale, "Open file", "فتح الملف")}
          >
            {isImage ? (
              <Image
                src={fileHref(doc.storagePath)}
                alt={label}
                fill
                unoptimized
                loading="eager"
                sizes="(min-width: 640px) 320px, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-ink">
                <FileText className="size-8 text-brand-500" aria-hidden />
                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#16182b] ring-1 ring-[#e3e5f2]">PDF</span>
              </span>
            )}
          </a>
        ) : (
          <button
            id={targetId}
            type="button"
            disabled={!canUpload || pending}
            onClick={() => input.current?.click()}
            className={cn(
              "flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
              dragging ? "border-brand bg-brand-50/60" : "border-[#d8dbea] bg-surface/50 hover:border-brand-300 hover:bg-brand-50/40",
            )}
          >
            <UploadCloud className="size-6 text-brand-500" aria-hidden />
            <span className="text-sm font-medium text-[#16182b]">{say(locale, "Upload file", "ارفع الملف")}</span>
            <span className="hidden text-xs text-muted-ink sm:block">{say(locale, "or drag it here", "أو اسحبه إلى هنا")}</span>
          </button>
        )}
      </div>

      {doc ? (
        <p dir="ltr" className="mt-2.5 truncate px-1 text-xs text-muted-ink rtl:text-right" title={doc.fileName}>
          <span className="text-[#16182b]">{doc.fileName}</span>
          {doc.sizeBytes ? ` · ${bytes(doc.sizeBytes)}` : ""}
        </p>
      ) : (
        <p className="mt-2.5 px-1 text-xs leading-relaxed text-muted-ink">{docHint(kind, locale) || t(locale, "apply.uploadFile")}</p>
      )}

      {error ? (
        <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs leading-relaxed text-rose-700">
          {error}
        </p>
      ) : null}

      {doc ? (
        <div className="mt-2 flex min-h-9 flex-wrap items-center gap-1">
          {confirming ? (
            <>
              <span className="px-1 text-xs font-medium text-[#16182b]">{say(locale, "Remove this file?", "حذف هذا الملف؟")}</span>
              <button type="button" onClick={remove} disabled={pending} className={cn(quietButton, "bg-rose-50 text-rose-700 hover:bg-rose-100")}>
                {say(locale, "Yes, remove", "نعم، احذف")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={quietButton}>
                {say(locale, "Keep", "إلغاء")}
              </button>
            </>
          ) : (
            <>
              {canUpload ? (
                <button id={targetId} type="button" onClick={() => input.current?.click()} disabled={pending} className={quietButton}>
                  <RefreshCw className="size-3.5" aria-hidden />
                  {t(locale, "common.replace")}
                </button>
              ) : null}
              <button type="button" onClick={() => setConfirming(true)} disabled={pending} className={cn(quietButton, "text-rose-600 hover:bg-rose-50")}>
                <Trash2 className="size-3.5" aria-hidden />
                {t(locale, "common.remove")}
              </button>
            </>
          )}
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        tabIndex={-1}
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />

      {pending ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/85 text-sm font-medium text-[#16182b]" role="status">
          <LoaderCircle className="size-5 animate-spin text-brand" aria-hidden />
          {task === "upload" ? say(locale, "Uploading…", "جارٍ الرفع…") : say(locale, "Removing…", "جارٍ الحذف…")}
        </div>
      ) : null}

      {dragging ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-brand-50/90 text-sm font-medium text-brand-700">
          <ImageUp className="size-5" aria-hidden />
          {say(locale, "Drop to upload", "أفلت الملف للرفع")}
        </div>
      ) : null}
    </div>
  );
}
