"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type DragEvent } from "react";
import { uploadDocumentAction } from "@/app/actions/apply";
import { Card, Pill, SectionTitle, bytes, fileHref, say } from "@/components/account/ui";
import { isClosedStatus, isUnpaidStatus, type Tone } from "@/lib/account-insights";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { docHint, docLabel } from "@/lib/localize";
import { sniffMime } from "@/lib/uploads";
import type { Application, ApplicationDocument, Traveler } from "@/lib/types";
import { cn } from "@/lib/utils";

type DocState = "verified" | "uploaded" | "rejected" | "missing";

type DocRow = { key: string; travelerId: string | null; kind: string; doc: ApplicationDocument | null; state: DocState };

type DocGroup = { key: string; name: string; rows: DocRow[] };

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

function rowState(doc: ApplicationDocument | null): DocState {
  if (!doc) return "missing";
  if (doc.status === "verified") return "verified";
  if (doc.status === "rejected") return "rejected";
  return "uploaded";
}

/** One row per required kind (first match wins, as in `documentGaps`), then any other kinds the traveller uploaded. */
function documentGroups(required: string[], travelers: Traveler[], documents: ApplicationDocument[], otherLabel: string): DocGroup[] {
  const kinds = required.length ? required : ["passport"];
  const customer = documents.filter((doc) => doc.kind !== "issued_visa");
  const known = new Set(travelers.map((traveler) => traveler.id));
  const groups: DocGroup[] = travelers.map((traveler, index) => {
    const own = customer.filter((doc) => doc.travelerId === traveler.id);
    const extra = [...new Set(own.map((doc) => doc.kind))].filter((kind) => !kinds.includes(kind));
    const rows = [...kinds, ...extra].map((kind) => {
      const doc = own.find((item) => item.kind === kind) ?? null;
      return { key: `${traveler.id}:${kind}`, travelerId: traveler.id, kind, doc, state: rowState(doc) };
    });
    const name = `${traveler.firstName} ${traveler.lastName}`.trim() || `#${index + 1}`;
    return { key: traveler.id, name, rows };
  });
  const loose = customer.filter((doc) => !doc.travelerId || !known.has(doc.travelerId));
  if (loose.length) {
    groups.push({
      key: "other",
      name: otherLabel,
      rows: loose.map((doc) => ({ key: `doc:${doc.id}`, travelerId: doc.travelerId, kind: doc.kind, doc, state: rowState(doc) })),
    });
  }
  return groups;
}

async function fileProblem(file: File) {
  if (file.size > MAX_BYTES) return "err.fileSize" as const;
  if (/\.hei[cf]$/i.test(file.name)) return "err.fileHeic" as const;
  const mime = sniffMime(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (mime === "image/heic") return "err.fileHeic" as const;
  if (!mime || !ACCEPTED.includes(mime)) return "err.fileType" as const;
  return null;
}

function UploadDrop({
  locale,
  applicationId,
  travelerId,
  kind,
  replacing,
  onDone,
}: {
  locale: string;
  applicationId: string;
  travelerId: string | null;
  kind: string;
  replacing: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [pending, start] = useTransition();
  const busy = pending || checking;

  async function send(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    setName(file.name);
    setChecking(true);
    const problem = await fileProblem(file);
    setChecking(false);
    if (problem) {
      setError(t(locale, problem));
      return;
    }
    const body = new FormData();
    body.set("locale", locale);
    body.set("applicationId", applicationId);
    body.set("travelerId", travelerId ?? "");
    body.set("kind", kind);
    body.set("file", file);
    start(async () => {
      const result = await uploadDocumentAction(body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDrag(false);
    void send(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="min-w-0">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        aria-busy={busy}
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-brand/30",
          drag ? "border-brand bg-brand-50" : error ? "border-rose-300 bg-white" : "border-[#cfd3e6] bg-white hover:border-brand-300 hover:bg-brand-50/40",
          busy && "cursor-wait opacity-80",
        )}
      >
        <input
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void send(file);
          }}
        />
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", busy ? "bg-brand-50" : "bg-brand text-white")}>
          {busy ? (
            <span className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          ) : (
            <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
              <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 13.5V15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-[#16182b]">
            {busy
              ? say(locale, "Uploading…", "جارٍ الرفع…")
              : replacing
                ? say(locale, "Upload a new copy", "ارفع نسخة جديدة")
                : say(locale, "Upload this document", "ارفع هذا المستند")}
          </span>
          <span className={cn("block text-xs leading-relaxed text-muted-ink", busy && "truncate")}>
            {busy && name ? name : say(locale, "Drop a file here or tap to choose · JPG, PNG, WebP or PDF, up to 10 MB", "اسحب الملف هنا أو اضغط للاختيار · JPG أو PNG أو WebP أو PDF حتى 10 ميغابايت")}
          </span>
        </span>
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-700">
          {name ? <span className="font-normal text-rose-600" dir="auto">{name}: </span> : null}
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Thumb({ doc, state }: { doc: ApplicationDocument | null; state: DocState }) {
  const box = "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl";
  if (!doc) return <span className={cn(box, "border border-dashed border-[#cfd3e6] text-lg text-muted-ink")}>+</span>;
  const image = (doc.mimeType ?? "").startsWith("image/");
  return (
    <a href={fileHref(doc.storagePath)} target="_blank" rel="noreferrer" className={cn(box, "bg-surface ring-1 ring-[#e3e5f2]", state === "rejected" && "ring-rose-200")}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileHref(doc.storagePath)} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="text-[10px] font-semibold tracking-wide text-rose-600">PDF</span>
      )}
    </a>
  );
}

export function DocumentsCard({
  locale,
  application,
  travelers,
  documents,
  readOnly,
}: {
  locale: string;
  application: Application;
  travelers: Traveler[];
  documents: ApplicationDocument[];
  readOnly: boolean;
}) {
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const groups = documentGroups(application.documentsRequired, travelers, documents, say(locale, "Other files", "ملفات أخرى"));
  const rows = groups.flatMap((group) => group.rows);
  const editable = isUnpaidStatus(application.status);
  const closed = isClosedStatus(application.status);
  const needs = rows.filter((row) => row.state === "rejected" || row.state === "missing").length;
  const verified = rows.filter((row) => row.state === "verified").length;

  const stateLabel: Record<DocState, [string, Tone]> = {
    verified: [t(locale, "account.docVerified"), "green"],
    uploaded: [editable ? t(locale, "account.docUploaded") : say(locale, "Under review", "قيد المراجعة"), editable ? "slate" : "brand"],
    rejected: closed ? [t(locale, "account.docRejected"), "slate"] : [say(locale, "Needs a new copy", "يحتاج نسخة جديدة"), "red"],
    missing: closed ? [say(locale, "Not provided", "لم يُقدّم"), "slate"] : [t(locale, "account.docMissing"), "amber"],
  };

  const hint = !rows.length
    ? undefined
    : closed
      ? say(locale, "Kept here for your records.", "محفوظة هنا للرجوع إليها.")
      : needs
        ? (
            <span className="font-medium text-rose-700">
              {needs === 1
                ? say(locale, "1 document needs your attention", "مستند واحد يحتاج انتباهك")
                : say(locale, `${needs} documents need your attention`, `${needs} مستندات تحتاج انتباهك`)}
            </span>
          )
        : verified === rows.length
          ? <span className="font-medium text-emerald-700">{say(locale, "All documents are verified", "كل المستندات معتمدة")}</span>
          : editable
            ? say(locale, "Our team checks every file after payment.", "يراجع فريقنا كل ملف بعد الدفع.")
            : say(locale, "Our team checks every file before filing.", "يراجع فريقنا كل ملف قبل التقديم.");

  return (
    <Card id="documents" className="scroll-mt-24 sm:p-6">
      <SectionTitle title={say(locale, "Documents", "المستندات")} hint={hint} />
      {!groups.length ? (
        <div className="mt-4 rounded-2xl bg-surface px-4 py-4 text-sm text-body">
          {say(locale, "Add the travellers first, then upload their documents.", "أضف المسافرين أولاً ثم ارفع مستنداتهم.")}
          {editable && !readOnly ? (
            <Link href={href(`/apply/${application.id}`, locale)} className="ms-1 font-medium text-brand-700 hover:underline">
              {t(locale, "account.continue")}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map((group) => {
            const ready = group.rows.filter((row) => (editable ? row.state !== "missing" : row.state === "verified")).length;
            return (
              <div key={group.key} className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#16182b]">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {group.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate" dir="auto">{group.name}</span>
                  </p>
                  {group.key !== "other" ? (
                    <span className="shrink-0 text-xs text-muted-ink tabular-nums">
                      {editable
                        ? say(locale, `${ready}/${group.rows.length} uploaded`, `${ready}/${group.rows.length} مرفوع`)
                        : say(locale, `${ready}/${group.rows.length} verified`, `${ready}/${group.rows.length} معتمد`)}
                    </span>
                  ) : null}
                </div>
                <ul className="mt-2.5 space-y-2">
                  {group.rows.map((row) => {
                    const [label, tone] = stateLabel[row.state];
                    const justSent = fresh.has(row.key) && row.state === "uploaded";
                    const canReplace = !readOnly && !closed && !editable && row.state === "rejected";
                    const canAdd = !readOnly && editable && row.state === "missing";
                    return (
                      <li
                        key={row.key}
                        className={cn(
                          "min-w-0 rounded-2xl border p-3",
                          row.state === "rejected" && !closed ? "border-rose-200 bg-rose-50/40" : "border-[#eceef6] bg-white",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Thumb doc={row.doc} state={row.state} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#16182b]">{docLabel(row.kind, locale)}</p>
                            {row.doc ? (
                              <a
                                href={fileHref(row.doc.storagePath)}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate text-xs text-muted-ink hover:text-brand-700 hover:underline"
                                dir="auto"
                              >
                                {row.doc.fileName}
                                {row.doc.sizeBytes ? ` · ${bytes(row.doc.sizeBytes)}` : ""}
                              </a>
                            ) : (
                              <p className="truncate text-xs text-muted-ink">{docHint(row.kind, locale) || say(locale, "Not uploaded yet", "لم يُرفع بعد")}</p>
                            )}
                          </div>
                          <Pill tone={tone} dot className="max-w-[45%] truncate">
                            {label}
                          </Pill>
                        </div>
                        {row.state === "rejected" ? (
                          <div className="mt-3 space-y-2.5">
                            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800 ring-1 ring-rose-100 ring-inset">
                              <span className="font-semibold">{say(locale, "Why it was refused: ", "سبب الرفض: ")}</span>
                              {row.doc?.rejectReason || say(locale, "The file was not clear enough.", "الملف غير واضح بما يكفي.")}
                            </p>
                            {canReplace ? (
                              <UploadDrop
                                locale={locale}
                                applicationId={application.id}
                                travelerId={row.travelerId}
                                kind={row.kind}
                                replacing
                                onDone={() => setFresh((current) => new Set(current).add(row.key))}
                              />
                            ) : editable && !readOnly ? (
                              <Link href={href(`/apply/${application.id}`, locale)} className="inline-block text-xs font-medium text-brand-700 hover:underline">
                                {say(locale, "Replace it in the application", "استبدله من صفحة الطلب")}
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                        {canAdd ? (
                          <div className="mt-3">
                            <UploadDrop
                              locale={locale}
                              applicationId={application.id}
                              travelerId={row.travelerId}
                              kind={row.kind}
                              replacing={false}
                              onDone={() => setFresh((current) => new Set(current).add(row.key))}
                            />
                          </div>
                        ) : null}
                        {row.state === "missing" && !editable && !closed && !readOnly ? (
                          <p className="mt-2.5 text-xs leading-relaxed text-muted-ink">
                            {say(locale, "This can't be added here after payment. ", "لا يمكن إضافته من هنا بعد الدفع. ")}
                            <Link href={href("/contact", locale)} className="font-medium text-brand-700 hover:underline">
                              {say(locale, "Send it to our team", "أرسله لفريقنا")}
                            </Link>
                          </p>
                        ) : null}
                        {justSent ? (
                          <p role="status" className="mt-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100 ring-inset">
                            {say(locale, "Received. Our team will check the new copy shortly.", "وصل الملف. سيراجع فريقنا النسخة الجديدة قريباً.")}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
