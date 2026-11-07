"use client";

import { useState } from "react";
import { adminDeleteIssuedVisa, adminUploadIssuedVisa } from "@/app/actions/admin";
import { AdminNotice, AdminPanel, adminPrimaryClass } from "@/components/admin/chrome";
import { ConfirmButton } from "@/components/admin/chrome-client";
import { shortDateTime } from "@/components/admin/format";
import type { Application, ApplicationDocument } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fileHref, fileSize, isImage } from "./model";
import { FeedbackLine, useRun } from "./use-run";

const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function pickIssue(files: File[]) {
  if (files.length > 8) return "يمكن رفع 8 ملفات في المرة الواحدة.";
  if (files.some((file) => !allowed.includes(file.type))) return "استخدم JPG أو PNG أو WebP أو PDF.";
  if (files.some((file) => file.size > 10 * 1024 * 1024)) return "كل ملف يجب أن يكون أصغر من 10 ميغابايت.";
  if (files.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) return "مجموع الملفات أكبر من 25 ميغابايت.";
  return null;
}

export function IssuedVisaPanel({ locale, application, issued }: { locale: string; application: Application; issued: ApplicationDocument[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const upload = useRun();
  const remove = useRun();
  const approved = application.status === "approved";
  const issue = pickIssue(files);

  return (
    <div className="space-y-4">
      {!approved ? (
        <AdminNotice tone="neutral">يُفتح رفع التأشيرة بعد نقل الطلب إلى «موافق عليه».</AdminNotice>
      ) : (
        <AdminPanel title="رفع التأشيرة الصادرة" hint="تُحفظ الملفات في حساب العميل وتُرسل مرفقة في بريده فور الرفع.">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!files.length || issue) return;
              const data = new FormData(event.currentTarget);
              upload.run(() => adminUploadIssuedVisa(locale, application.id, data), "رُفعت الملفات وأُرسلت مرفقة في بريد العميل.", () => {
                setFiles([]);
                setInputKey((key) => key + 1);
              });
            }}
          >
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]",
                files.length ? "border-primary/40" : "border-input",
              )}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-7 fill-none stroke-muted-foreground" strokeWidth="1.5">
                <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium">{files.length ? `${files.length} ملف جاهز للرفع` : "اختر ملفات التأشيرة"}</span>
              <span className="text-xs text-muted-foreground">صور أو PDF · حتى 8 ملفات · 10 ميغابايت للملف</span>
              <input
                key={inputKey}
                name="file"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
            </label>
            {files.length ? (
              <ul className="space-y-1 text-xs">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-3 py-1.5">
                    <span className="truncate" dir="ltr">
                      {file.name}
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">{fileSize(file.size)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {issue ? <p className="text-xs text-rose-300">{issue}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={upload.pending || !files.length || Boolean(issue)} className={adminPrimaryClass}>
                {upload.pending ? "جارٍ الرفع والإرسال…" : "رفع وإرسال للعميل"}
              </button>
              <FeedbackLine feedback={upload.feedback} />
            </div>
          </form>
        </AdminPanel>
      )}

      <AdminPanel title="ملفات التأشيرة المرسلة" hint={issued.length ? undefined : "لم يُرفع أي ملف بعد."} flush>
        {issued.length ? (
          <ul className="divide-y divide-border/70">
            {issued.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <a href={fileHref(doc.storagePath)} target="_blank" rel="noreferrer" className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
                  {isImage(doc) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileHref(doc.storagePath)} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground">PDF</span>
                  )}
                </a>
                <div className="min-w-0 flex-1">
                  <a href={fileHref(doc.storagePath)} target="_blank" rel="noreferrer" className="block truncate text-sm hover:text-primary" dir="ltr">
                    {doc.fileName}
                  </a>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {shortDateTime(doc.createdAt)}
                    {doc.sizeBytes ? ` · ${fileSize(doc.sizeBytes)}` : ""}
                  </p>
                </div>
                <ConfirmButton disabled={remove.pending} onConfirm={() => remove.run(() => adminDeleteIssuedVisa(locale, application.id, doc.id), "حُذف الملف.")} className="h-8 px-3 text-xs" confirmLabel="تأكيد الحذف">
                  حذف
                </ConfirmButton>
              </li>
            ))}
          </ul>
        ) : null}
        <FeedbackLine feedback={remove.feedback} className="px-5 pb-3" />
      </AdminPanel>
    </div>
  );
}
