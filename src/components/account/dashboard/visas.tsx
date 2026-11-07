"use client";

import Link from "next/link";
import { BadgeCheck, Download, FileArchive, FileText } from "lucide-react";
import type { IssuedVisaRow } from "@/lib/account";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { localizedVisaLabel } from "@/lib/localize";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/visa";
import { Card, CopyText, EmptyState, Flag, bytes, fileHref, primaryButton, quietButton, say, secondaryButton } from "@/components/account/ui";
import { destinationName, type OrderFilter, type Tab } from "./model";

export function Visas({
  locale,
  visas,
  apps,
  onPick,
}: {
  locale: string;
  visas: IssuedVisaRow[];
  apps: Application[];
  onPick: (tab: Tab, filter?: OrderFilter) => void;
}) {
  const groups = new Map<string, IssuedVisaRow[]>();
  for (const visa of visas) groups.set(visa.applicationId, [...(groups.get(visa.applicationId) ?? []), visa]);
  const byId = new Map(apps.map((app) => [app.id, app]));

  if (!groups.size) {
    return (
      <EmptyState
        title={say(locale, "No visas yet", "لا توجد تأشيرات بعد")}
        body={say(locale, "Approved visas appear here, ready to download.", "تظهر هنا تأشيراتك بعد الموافقة، جاهزة للتنزيل.")}
        action={
          apps.length ? (
            <button type="button" onClick={() => onPick("orders", "open")} className={secondaryButton}>
              {say(locale, "Track my applications", "تتبّع طلباتي")}
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <p className="flex items-start gap-2 rounded-2xl bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
        <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        {say(locale, "Print your visa and keep it with your passport. Border officers may ask to see it.", "اطبع تأشيرتك واحتفظ بها مع جواز سفرك، فقد يطلبها موظف الجوازات.")}
      </p>
      {[...groups.entries()].map(([applicationId, files]) => {
        const first = files[0];
        const app = byId.get(applicationId);
        const name = app ? destinationName(app, locale) : first.destinationName;
        const label = first.visaLabel ? localizedVisaLabel(first, locale) : "";
        const issued = first.deliveredAt ?? first.createdAt;
        return (
          <Card key={applicationId}>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Flag src={app?.destinationFlag ?? null} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[#16182b]">{name}</p>
                  {label ? <p className="truncate text-xs text-muted-ink">{label}</p> : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink">
                    <CopyText value={first.reference} locale={locale} />
                    <span>
                      {say(locale, "Delivered", "تاريخ التسليم")}: {formatDate(issued, locale)}
                    </span>
                  </div>
                </div>
              </div>
              <a href={`/api/account/visas/${applicationId}/zip`} className={cn(files.length > 1 ? primaryButton : secondaryButton, "w-full sm:w-auto")}>
                <FileArchive aria-hidden className="size-4" />
                {files.length > 1 ? `${t(locale, "account.downloadAll")} (ZIP)` : say(locale, "Download as ZIP", "تنزيل كملف ZIP")}
              </a>
            </div>
            <ul className="mt-4 grid gap-2">
              {files.map((file) => (
                <li key={file.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-[#e3e5f2]">
                    <FileText aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#16182b]">
                      <bdi>{file.fileName}</bdi>
                    </span>
                    {file.sizeBytes ? (
                      <span className="block text-xs text-muted-ink">
                        <bdi>{bytes(file.sizeBytes)}</bdi>
                      </span>
                    ) : null}
                  </span>
                  <a href={fileHref(file.storagePath)} target="_blank" rel="noreferrer" className={cn(primaryButton, "h-9 shrink-0 px-3.5")}>
                    <Download aria-hidden className="size-4" />
                    {t(locale, "account.download")}
                  </a>
                </li>
              ))}
            </ul>
            <Link href={href(`/account/applications/${applicationId}#visa`, locale)} className={cn(quietButton, "mt-3 -ms-3")}>
              {say(locale, "Application details", "تفاصيل الطلب")}
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
