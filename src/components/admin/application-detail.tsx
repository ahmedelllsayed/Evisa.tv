"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { adminAddEvent, adminDeclineRefund, adminRefund, adminSetAssignee, adminSetDocumentStatus, adminSetStatus, adminUploadIssuedVisa } from "@/app/actions/admin";
import { AdminCard, AdminEmpty, AdminPage, adminGhostClass, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { statusLabels } from "@/components/admin/status";
import { documentGaps } from "@/lib/application-rules";
import { href } from "@/lib/href";
import type { AccountRow } from "@/lib/data/users";
import type { Application, ApplicationDocument, ApplicationEvent, ApplicationStatus, Payment, Traveler } from "@/lib/types";
import { formatAt, formatMoney } from "@/lib/visa";
import { cn } from "@/lib/utils";

const statuses: ApplicationStatus[] = [
  "draft",
  "payment_pending",
  "submitted",
  "in_review",
  "filed",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
];

const tabs = [
  ["travelers", "المسافرون"],
  ["documents", "المستندات"],
  ["payment", "الدفع"],
  ["activity", "النشاط"],
] as const;

type Tab = (typeof tabs)[number][0];

function fileHref(storagePath: string) {
  return `/api/files/${storagePath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

export function AdminApplicationDetail({
  locale,
  application,
  events,
  travelers,
  documents,
  payments,
  assignees,
  refundRequest = null,
}: {
  locale: string;
  application: Application;
  events: ApplicationEvent[];
  travelers: Traveler[];
  documents: ApplicationDocument[];
  payments: Payment[];
  assignees: AccountRow[];
  refundRequest?: { status: "open" | "approved" | "declined"; reason: string } | null;
}) {
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("travelers");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const reviewDocs = documents.filter((document) => document.kind !== "issued_visa");
  const issued = documents.find((document) => document.kind === "issued_visa");
  const gaps = documentGaps(application.documentsRequired, travelers, reviewDocs);
  const waitingReview = reviewDocs.some((document) => document.status === "uploaded");
  const paid = payments.some((payment) => payment.status === "paid");
  const next = !application.assigneeId
    ? "عيّن مسؤولًا عن هذا الطلب."
    : gaps.length || waitingReview
      ? "راجع المستندات المطلوبة."
      : application.status === "approved" && !issued
        ? "ارفع ملف التأشيرة الصادرة."
        : application.status === "submitted" || application.status === "payment_pending"
          ? "حدّث الحالة بعد المراجعة."
          : "لا يوجد إجراء عاجل.";

  return (
    <AdminPage title={application.reference} description={`${application.destinationName} · ${application.userEmail} · ${formatMoney(application.totalAmount, application.currency)}`}>
      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4">
          <AdminCard>
            <p className="text-sm text-muted-ink">الخطوة التالية</p>
            <p className="mt-1 font-medium">{next}</p>
            <p className="mt-3 text-xs text-muted-ink">
              {statusLabels[application.status]} · الاستحقاق {application.guaranteedAt ? formatAt(application.guaranteedAt) : "—"}
            </p>
            {(gaps.length || waitingReview) && (
              <button type="button" className={`${adminGhostClass} mt-3`} onClick={() => setTab("documents")}>
                فتح المستندات
              </button>
            )}
            <form
              className="mt-4 grid gap-2"
              action={(fd) => {
                const value = String(fd.get("assignee") || "");
                start(() => adminSetAssignee(locale, application.id, value || null));
              }}
            >
              <label className="text-sm">
                المسؤول
                <select name="assignee" defaultValue={application.assigneeId ?? ""} className={`${adminInputClass} mt-1 block`}>
                  <option value="">بدون تعيين</option>
                  {assignees.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.fullName || person.email}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={pending} className={adminGhostClass}>
                حفظ التعيين
              </button>
            </form>
            <form
              className="mt-4 grid gap-2"
              action={(fd) =>
                start(async () => {
                  setError(null);
                  const result = await adminSetStatus(
                    locale,
                    application.id,
                    fd.get("status") as ApplicationStatus,
                    String(fd.get("title") || `تحديث الحالة: ${fd.get("status")}`),
                    String(fd.get("description") || ""),
                  );
                  if (!result.ok) setError(result.error);
                })
              }
            >
              <label className="text-sm">
                الحالة
                <select name="status" defaultValue={application.status} className={`${adminInputClass} mt-1 block`}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <input name="title" placeholder="عنوان التحديث للعميل" className={adminInputClass} />
              <input name="description" placeholder="ملاحظة تصل للعميل بالبريد" className={adminInputClass} />
              <button disabled={pending} className={adminPrimaryClass}>
                تحديث الحالة
              </button>
            </form>
            {application.status === "approved" && (
              <form
                className="mt-4 grid gap-2"
                action={(fd) =>
                  start(async () => {
                    setError(null);
                    const result = await adminUploadIssuedVisa(locale, application.id, fd);
                    if (!result.ok) setError(result.error);
                    else setNote("تم رفع ملف التأشيرة وإرسال البريد.");
                  })
                }
              >
                <label className="text-sm">
                  ملف التأشيرة الصادرة
                  <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block text-sm" />
                </label>
                <button disabled={pending} className={adminPrimaryClass}>
                  رفع التأشيرة
                </button>
                {issued && (
                  <a href={fileHref(issued.storagePath)} target="_blank" rel="noreferrer" className="text-sm text-brand">
                    {issued.fileName}
                  </a>
                )}
              </form>
            )}
            {note && <p className="mt-3 text-sm text-muted-ink">{note}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </AdminCard>
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn("shrink-0 rounded-full px-3 py-1 text-sm", tab === id ? "bg-brand text-white" : "border border-line bg-white text-ink")}
              >
                {label}
              </button>
            ))}
          </div>

      {tab === "travelers" && (
        <AdminCard>
          <h2 className="font-semibold">المسافرون</h2>
          {travelers.length === 0 ? (
            <AdminEmpty>لا يوجد مسافرون بعد.</AdminEmpty>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {travelers.map((traveler) => (
                <li key={traveler.id} className="rounded-xl border border-line px-4 py-3">
                  {traveler.firstName} {traveler.lastName}
                  <span className="mt-1 block text-muted-ink">
                    {traveler.passportNumber || "بدون جواز"} · {traveler.nationality || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}

      {tab === "documents" && (
        <AdminCard>
          <h2 className="font-semibold">المستندات</h2>
          {reviewDocs.length === 0 ? (
            <AdminEmpty>لا توجد مستندات مرفوعة.</AdminEmpty>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {reviewDocs.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3">
                  <span>
                    {document.kind} · {document.fileName}
                    <span className="mt-1 block text-xs text-muted-ink">
                      {document.status}
                      {document.rejectReason ? ` · ${document.rejectReason}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <a href={fileHref(document.storagePath)} target="_blank" rel="noreferrer" className="text-xs text-brand underline">
                      عرض
                    </a>
                    <button
                      type="button"
                      className="rounded-full bg-black px-3 py-1 text-xs text-white"
                      onClick={() =>
                        start(async () => {
                          setError(null);
                          const result = await adminSetDocumentStatus(locale, application.id, document.id, "verified");
                          if (!result.ok) setError(result.error);
                        })
                      }
                    >
                      قبول
                    </button>
                    <input
                      value={reasons[document.id] ?? ""}
                      onChange={(event) => setReasons((current) => ({ ...current, [document.id]: event.target.value }))}
                      placeholder="سبب الرفض"
                      className={`${adminInputClass} w-40`}
                    />
                    <button
                      type="button"
                      className="rounded-full border px-3 py-1 text-xs"
                      onClick={() =>
                        start(async () => {
                          setError(null);
                          const result = await adminSetDocumentStatus(locale, application.id, document.id, "rejected", reasons[document.id]);
                          if (!result.ok) setError(result.error);
                        })
                      }
                    >
                      رفض
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {gaps.length > 0 && <p className="mt-3 text-sm text-red-600">لا يمكن نقل الطلب إلى «مُرسل للجهة» قبل اكتمال المستندات المطلوبة.</p>}
        </AdminCard>
      )}

      {tab === "payment" && (
        <AdminCard>
          <h2 className="font-semibold">المدفوعات</h2>
          {payments.length === 0 ? (
            <AdminEmpty>لا توجد عمليات دفع.</AdminEmpty>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="rounded-xl border border-line px-4 py-3">
                  {payment.provider} · {payment.status} · {formatMoney(payment.amount, payment.currency)}
                  <span className="mt-1 block text-xs text-muted-ink">{payment.providerRef}</span>
                </li>
              ))}
            </ul>
          )}
          {refundRequest && (
            <div className="mt-4 rounded-xl border border-line px-4 py-3 text-sm">
              <p className="font-medium">طلب استرداد · {refundRequest.status}</p>
              <p className="mt-1 text-body">{refundRequest.reason}</p>
              {refundRequest.status === "open" && (
                <button
                  type="button"
                  disabled={pending}
                  className={`${adminGhostClass} mt-3`}
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      await adminDeclineRefund(locale, application.id);
                      setNote("رُفض طلب الاسترداد.");
                    })
                  }
                >
                  رفض طلب الاسترداد
                </button>
              )}
            </div>
          )}
          {paid && application.status !== "refunded" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending}
                className={adminGhostClass}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const result = await adminRefund(locale, application.id);
                    if (!result.ok) setError(result.error);
                    else setNote("تم تعليم الدفعة كمستردة.");
                  })
                }
              >
                استرداد
              </button>
              <Link href={href("/transparency/refunds-policy", locale)} className="text-sm text-brand">
                سياسة الاسترداد
              </Link>
            </div>
          )}
        </AdminCard>
      )}

      {tab === "activity" && (
        <AdminCard>
          <form
            className="flex flex-wrap gap-2"
            action={(fd) => {
              setNote("حُفظت الملاحظة الداخلية.");
              start(() => adminAddEvent(locale, application.id, String(fd.get("title")), String(fd.get("description"))));
            }}
          >
            <input required name="title" placeholder="ملاحظة داخلية" className={`${adminInputClass} min-w-40 flex-1`} />
            <input name="description" placeholder="لا تُرسل للعميل" className={`${adminInputClass} min-w-40 flex-1`} />
            <button className={adminGhostClass}>حفظ الملاحظة</button>
          </form>
          {note && <p className="mt-2 text-sm text-muted-ink">{note}</p>}
          <ol className="mt-6 space-y-3 text-sm">
            {events.map((event) => (
              <li key={event.id}>
                <p className="font-medium">
                  {event.title}{" "}
                  <span className="text-xs font-normal text-muted-ink">{event.internal ? "داخلية" : "للعميل"}</span>
                </p>
                <p className="text-body">{event.description}</p>
                <p className="text-xs text-muted-ink">{formatAt(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        </AdminCard>
      )}
        </div>
      </div>
    </AdminPage>
  );
}
