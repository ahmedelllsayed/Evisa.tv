"use client";

import Link from "next/link";
import { AlertCircle, ChevronLeft, FileText, FolderLock, Upload } from "lucide-react";
import type { ApplicationGapCount, UserFileRow } from "@/lib/account";
import { isClosedStatus, type Tone } from "@/lib/account-insights";
import { href } from "@/lib/href";
import { t, type MessageKey } from "@/lib/i18n";
import { docLabel } from "@/lib/localize";
import type { ProfileDocument } from "@/lib/profile";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CopyText, EmptyState, Flag, Pill, SectionTitle, bytes, fileHref, quietButton, say } from "@/components/account/ui";
import { destinationName, documentCount } from "./model";
import { GapBadges } from "./parts";

const docStatus: Record<UserFileRow["status"], { key: MessageKey; tone: Tone }> = {
  uploaded: { key: "account.docUploaded", tone: "brand" },
  verified: { key: "account.docVerified", tone: "green" },
  rejected: { key: "account.docRejected", tone: "red" },
};

export function Files({
  locale,
  apps,
  documents,
  profileDocuments,
  gaps,
}: {
  locale: string;
  apps: Application[];
  documents: UserFileRow[];
  profileDocuments: ProfileDocument[];
  gaps: Map<string, ApplicationGapCount>;
}) {
  const byId = new Map(apps.map((app) => [app.id, app]));
  const groups = new Map<string, UserFileRow[]>();
  for (const doc of documents) groups.set(doc.applicationId, [...(groups.get(doc.applicationId) ?? []), doc]);
  const ordered = [...groups.entries()].sort(([, a], [, b]) => {
    const rejected = Number(b.some((doc) => doc.status === "rejected")) - Number(a.some((doc) => doc.status === "rejected"));
    const latest = (rows: UserFileRow[]) => rows.reduce((max, row) => (row.createdAt > max ? row.createdAt : max), "");
    return rejected || latest(b).localeCompare(latest(a));
  });

  return (
    <div className="grid min-w-0 gap-4">
      <Card>
        <SectionTitle
          title={t(locale, "account.profileDocs")}
          hint={say(locale, "Reused automatically on your next applications.", "تُستخدم تلقائياً في طلباتك القادمة.")}
          action={
            <Link href={href("/account/profile", locale)} className={quietButton}>
              {t(locale, "account.editProfile")}
            </Link>
          }
        />
        {profileDocuments.length === 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface p-4">
            <FolderLock aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-ink" />
            <p className="text-sm leading-relaxed text-muted-ink">
              {say(
                locale,
                "Save a passport scan and a personal photo on your profile so you never upload them twice.",
                "احفظ صورة الجواز وصورتك الشخصية في ملفك حتى لا ترفعهما مرة أخرى.",
              )}
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {profileDocuments.map((doc) => (
              <li key={doc.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-[#e3e5f2]">
                  <FileText aria-hidden className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#16182b]">{docLabel(doc.kind, locale)}</span>
                  <span className="block truncate text-xs text-muted-ink">
                    <bdi>{doc.fileName}</bdi>
                    {doc.sizeBytes ? (
                      <>
                        {" · "}
                        <bdi>{bytes(doc.sizeBytes)}</bdi>
                      </>
                    ) : null}
                  </span>
                </span>
                <a href={fileHref(doc.storagePath)} target="_blank" rel="noreferrer" className={cn(quietButton, "shrink-0")}>
                  {t(locale, "common.view")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {ordered.length === 0 ? (
        <EmptyState title={t(locale, "account.noFiles")} body={say(locale, "Documents you upload with an application appear here with their review status.", "تظهر هنا المستندات التي ترفعها مع طلباتك وحالة مراجعتها.")} />
      ) : (
        ordered.map(([applicationId, rows]) => {
          const app = byId.get(applicationId);
          const gap = gaps.get(applicationId);
          return (
            <Card key={applicationId}>
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Flag src={app?.destinationFlag ?? null} className="size-10" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#16182b]">{app ? destinationName(app, locale) : rows[0].destinationName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-ink">
                      <CopyText value={rows[0].reference} locale={locale} />
                      <span>{documentCount(locale, rows.length)}</span>
                    </div>
                  </div>
                </div>
                <Link href={href(`/account/applications/${applicationId}#documents`, locale)} className={quietButton}>
                  {say(locale, "Open application", "فتح الطلب")}
                  <ChevronLeft aria-hidden className="size-3.5 ltr:rotate-180" />
                </Link>
              </div>
              <GapBadges gap={gap && app && !isClosedStatus(app.status) ? { ...gap, rejected: 0 } : undefined} locale={locale} className="mt-3" />
              <ul className="mt-4 grid gap-2">
                {rows.map((doc) => {
                  const status = docStatus[doc.status];
                  return (
                    <li key={doc.id} className={cn("min-w-0 rounded-2xl px-3 py-2.5", doc.status === "rejected" ? "bg-rose-50/70 ring-1 ring-rose-100" : "bg-surface")}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[#16182b]">
                            {docLabel(doc.kind, locale)}
                            {doc.travelerName ? <span className="font-normal text-muted-ink"> · {doc.travelerName}</span> : null}
                          </span>
                          <a
                            href={fileHref(doc.storagePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-muted-ink underline-offset-2 hover:text-brand-700 hover:underline"
                          >
                            <bdi>{doc.fileName}</bdi>
                          </a>
                        </span>
                        <Pill tone={status.tone} dot>
                          {t(locale, status.key)}
                        </Pill>
                      </div>
                      {doc.status === "rejected" ? (
                        <div className="mt-2 flex flex-col gap-2 border-t border-rose-100 pt-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-rose-700">
                            <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                            <bdi>{doc.rejectReason || say(locale, "This file could not be accepted.", "تعذّر قبول هذا الملف.")}</bdi>
                          </p>
                          <Link
                            href={href(`/account/applications/${applicationId}#documents`, locale)}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full bg-rose-600 px-3 text-xs font-medium text-white hover:bg-rose-700 sm:self-auto"
                          >
                            <Upload aria-hidden className="size-3.5" />
                            {say(locale, "Replace", "استبدال")}
                          </Link>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })
      )}
    </div>
  );
}
