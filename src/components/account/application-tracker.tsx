"use client";

import Link from "next/link";
import { useLiveApplication } from "@/components/account/live-application";
import { documentLabels } from "@/data/seed/content";
import { documentGaps, isPastGuarantee } from "@/lib/application-rules";
import { href } from "@/lib/href";
import type { Application, ApplicationDocument, ApplicationEvent, Traveler } from "@/lib/types";
import { formatAt, formatMoney } from "@/lib/visa";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  draft: "Draft",
  payment_pending: "Awaiting payment",
  submitted: "Submitted",
  in_review: "In review",
  filed: "Filed with government",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

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
        {late && <p className="mt-1 text-xs font-medium text-red-700">Past the guaranteed date</p>}
      </div>
      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
        {labels[app.status] ?? app.status}
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
}: {
  locale: string;
  application: Application;
  events: ApplicationEvent[];
  documents: ApplicationDocument[];
  travelers: Traveler[];
}) {
  useLiveApplication(application.id);
  const late = isPastGuarantee(application.status, application.guaranteedAt);
  const gaps = documentGaps(application.documentsRequired, travelers, documents);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-muted-ink">{application.reference}</p>
      <h1 className="font-display text-3xl font-semibold">{application.destinationName} visa</h1>
      <p className="mt-2 text-sm">
        Status: <span className="font-medium">{labels[application.status]}</span>
      </p>
      {application.guaranteedAt && (
        <p className={cn("mt-1 text-sm", late ? "font-medium text-red-700" : "text-body")}>
          Guaranteed by {formatAt(application.guaranteedAt)}
          {late ? " · past the guaranteed date" : ""}
        </p>
      )}
      <p className="mt-1 text-sm text-body">Total {formatMoney(application.totalAmount, application.currency)}</p>
      {application.status === "draft" || application.status === "payment_pending" ? (
        <Link
          href={href(`/apply/${application.id}`, locale)}
          className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm text-white"
        >
          Continue application
        </Link>
      ) : null}
      {documents.some((document) => document.kind === "issued_visa") && (
        <div className="mt-6 rounded-xl border border-line px-3 py-3 text-sm">
          <p className="font-medium">Issued visa</p>
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
