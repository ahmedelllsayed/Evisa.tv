"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLiveApplication } from "@/components/account/live-application";
import { requestRefundAction } from "@/app/actions/inbox";
import { documentLabels } from "@/data/seed/content";
import { documentGaps, isPastGuarantee } from "@/lib/application-rules";
import { href } from "@/lib/href";
import { t, type MessageKey } from "@/lib/i18n";
import type { Application, ApplicationDocument, ApplicationEvent, ApplicationStatus, Traveler } from "@/lib/types";
import { formatAt, formatMoney } from "@/lib/visa";
import { cn } from "@/lib/utils";

const statusKeys: Record<ApplicationStatus, MessageKey> = {
  draft: "status.draft",
  payment_pending: "status.payment_pending",
  submitted: "status.submitted",
  in_review: "status.in_review",
  filed: "status.filed",
  approved: "status.approved",
  rejected: "status.rejected",
  cancelled: "status.cancelled",
  refunded: "status.refunded",
};

function statusLabel(locale: string, status: string) {
  const key = statusKeys[status as ApplicationStatus];
  return key ? t(locale, key) : status;
}

export function ApplicationCard({ app, locale }: { app: Application; locale: string }) {
  const late = isPastGuarantee(app.status, app.guaranteedAt);
  return (
    <Link
      href={href(`/account/applications/${app.id}`, locale)}
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border p-4 hover:bg-surface",
        late ? "border-red-300 bg-red-50" : "border-line",
      )}
    >
      <div>
        <p className="font-medium">{app.destinationName}</p>
        <p className="text-xs text-muted-ink">{app.reference}</p>
        {late && <p className="mt-1 text-xs font-medium text-red-700">{t(locale, "account.late")}</p>}
      </div>
      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
        {statusLabel(locale, app.status)}
      </span>
    </Link>
  );
}

export function ApplicationTracker({
  locale,
  application,
  events,
  documents,
  travelers,
  refundStatus = null,
}: {
  locale: string;
  application: Application;
  events: ApplicationEvent[];
  documents: ApplicationDocument[];
  travelers: Traveler[];
  refundStatus?: "open" | "approved" | "declined" | null;
}) {
  useLiveApplication(application.id);
  const late = isPastGuarantee(application.status, application.guaranteedAt);
  const gaps = documentGaps(application.documentsRequired, travelers, documents);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-muted-ink">{application.reference}</p>
      <h1 className="font-display text-3xl font-semibold">{application.destinationName}</h1>
      <p className="mt-2 text-sm">
        {t(locale, "account.status")}: <span className="font-medium">{statusLabel(locale, application.status)}</span>
      </p>
      {application.guaranteedAt && (
        <p className={cn("mt-1 text-sm", late ? "font-medium text-red-700" : "text-body")}>
          {t(locale, "account.guaranteed")} {formatAt(application.guaranteedAt)}
          {late ? ` · ${t(locale, "account.late")}` : ""}
        </p>
      )}
      <p className="mt-1 text-sm text-body">
        {t(locale, "account.total")} {formatMoney(application.totalAmount, application.currency)}
      </p>
      {application.status === "draft" || application.status === "payment_pending" ? (
        <Link
          href={href(`/apply/${application.id}`, locale)}
          className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm text-white"
        >
          {t(locale, "account.continue")}
        </Link>
      ) : null}
      <RefundRequestBox locale={locale} application={application} refundStatus={refundStatus} />
      {documents.some((document) => document.kind === "issued_visa") && (
        <div className="mt-6 rounded-xl border border-line px-3 py-3 text-sm">
          <p className="font-medium">{t(locale, "account.issued")}</p>
          {documents
            .filter((document) => document.kind === "issued_visa")
            .map((document) => (
              <a
                key={document.id}
                href={`/api/files/${document.storagePath.split("/").map((part) => encodeURIComponent(part)).join("/")}`}
                className="mt-1 block text-brand"
                target="_blank"
                rel="noreferrer"
              >
                {document.fileName}
              </a>
            ))}
        </div>
      )}
      {documents.filter((document) => document.kind !== "issued_visa").length > 0 && (
        <ul className="mt-6 space-y-2 text-sm">
          {documents
            .filter((document) => document.kind !== "issued_visa")
            .map((document) => (
            <li key={document.id} className="rounded-xl border border-line px-3 py-2">
              {documentLabels[document.kind]?.label ?? document.kind} · {document.fileName}
              {document.status === "rejected" && (
                <span className="mt-1 block text-xs text-red-600">
                  Rejected{document.rejectReason ? `: ${document.rejectReason}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {gaps.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-red-700">
          {gaps.map((gap) => (
            <li key={`${gap.travelerId}-${gap.kind}`}>
              {gap.travelerName}: {documentLabels[gap.kind]?.label ?? gap.kind}{" "}
              {gap.reason === "rejected" ? `rejected${gap.rejectReason ? ` — ${gap.rejectReason}` : ""}` : "is still missing"}
            </li>
          ))}
        </ul>
      )}
      <ol className="mt-8 space-y-4">
        {events.map((e) => (
          <li key={e.id} className="flex gap-3">
            <span className={cn("mt-1 size-2 rounded-full", e.onTime ? "bg-success" : "bg-warning")} />
            <div>
              <p className="font-medium">{e.title}</p>
              {e.description && <p className="text-sm text-body">{e.description}</p>}
              <p className="text-xs text-muted-ink">
                {formatAt(e.createdAt)}
                {e.onTime ? " · On time" : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RefundRequestBox({
  locale,
  application,
  refundStatus,
}: {
  locale: string;
  application: Application;
  refundStatus: "open" | "approved" | "declined" | null;
}) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState(refundStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const eligible = Boolean(application.paidAt) && application.status !== "refunded" && application.status !== "cancelled" && application.status !== "draft";
  if (status === "open" || status === "approved") {
    return <p className="mt-6 rounded-xl bg-surface px-3 py-3 text-sm">{t(locale, "account.refundSent")}</p>;
  }
  if (status === "declined") {
    return <p className="mt-6 text-sm text-body">{t(locale, "account.refundDeclined")}</p>;
  }
  if (!eligible) return null;
  return (
    <form
      className="mt-6 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        start(async () => {
          const result = await requestRefundAction(locale, application.id, reason);
          if (!result.ok) setError(result.error);
          else setStatus(result.status);
        });
      }}
    >
      <label className="text-sm font-medium">
        {t(locale, "account.refundReason")}
        <textarea
          required
          minLength={8}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded-xl border border-line px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="h-10 w-fit rounded-full bg-brand px-4 text-sm text-white disabled:opacity-60">
        {t(locale, "account.refund")}
      </button>
    </form>
  );
}
