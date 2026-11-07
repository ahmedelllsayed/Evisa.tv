"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdminPage, AdminPanel, KeyValue, adminGhostClass, type Tone } from "@/components/admin/chrome";
import { relativeTime, shortDateTime } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { ActivityPanel, type HistoryRow } from "@/components/admin/applications/activity-panel";
import { DocumentReview } from "@/components/admin/applications/document-review";
import { IssuedVisaPanel } from "@/components/admin/applications/issued-visa";
import { slaFor } from "@/components/admin/applications/model";
import { nextStep, type DetailTab, type NextStep, type StepAction } from "@/components/admin/applications/next-step";
import { DocCounts, Flag, SlaText } from "@/components/admin/applications/parts";
import { PaymentPanel } from "@/components/admin/applications/payment-panel";
import { TravelerPanel } from "@/components/admin/applications/traveler-panel";
import { AssignPanel, StatusChanger } from "@/components/admin/applications/workflow";
import { StaffFollowUp } from "@/components/admin/staff-follow-up";
import { documentGaps, documentsReadyToFile } from "@/lib/application-rules";
import { href } from "@/lib/href";
import type { AccountRow } from "@/lib/data/users";
import type { Application, ApplicationDocument, ApplicationEvent, ApplicationStatus, Payment, Traveler } from "@/lib/types";
import { localizedPhrase } from "@/lib/localize";
import { cn } from "@/lib/utils";
import { formatMoney, processingLabel } from "@/lib/visa";

export type DetailCustomer = { id: string; email: string; fullName: string | null; phone: string | null; banned: boolean; createdAt: string; applications: number };

const stepAccent: Record<Tone, string> = {
  neutral: "border-s-muted-foreground/40",
  info: "border-s-sky-400",
  success: "border-s-emerald-500",
  warning: "border-s-amber-400",
  danger: "border-s-rose-500",
};

const stepText: Record<Tone, string> = {
  neutral: "text-foreground",
  info: "text-sky-200",
  success: "text-emerald-200",
  warning: "text-amber-100",
  danger: "text-rose-200",
};

const stepDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-sky-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

export function AdminApplicationDetail({
  locale,
  application,
  events,
  travelers,
  documents,
  payments,
  assignees,
  refundRequest = null,
  history = [],
  customer = null,
  now,
  currentUserId = "",
}: {
  locale: string;
  application: Application;
  events: ApplicationEvent[];
  travelers: Traveler[];
  documents: ApplicationDocument[];
  payments: Payment[];
  assignees: AccountRow[];
  refundRequest?: { status: "open" | "approved" | "declined"; reason: string } | null;
  history?: HistoryRow[];
  customer?: DetailCustomer | null;
  now: string;
  currentUserId?: string;
}) {
  const [tab, setTab] = useState<DetailTab>("documents");
  const [target, setTarget] = useState<ApplicationStatus | null>(null);

  const reviewDocs = documents.filter((document) => document.kind !== "issued_visa");
  const issued = documents.filter((document) => document.kind === "issued_visa");
  const gaps = documentGaps(application.documentsRequired, travelers, reviewDocs);
  const waitingReview = reviewDocs.filter((document) => document.status === "uploaded").length;
  const readyToFile = documentsReadyToFile(application.documentsRequired, travelers, reviewDocs);
  const sla = slaFor(application, now);
  const reviews = events.filter((event) => event.internal && event.title === "Payment needs review");
  const paid = Boolean(application.paidAt) || payments.some((payment) => payment.status === "paid");
  const refunded = payments.some((payment) => payment.refundedAmount > 0);
  const staff = assignees.map((person) => ({ id: person.id, label: person.fullName || person.email }));
  const assigneeName = staff.find((person) => person.id === application.assigneeId)?.label ?? application.assigneeEmail ?? null;
  const step = nextStep({ app: application, sla, waitingReview, gaps, readyToFile, issuedCount: issued.length, paymentReview: reviews.length > 0, refund: refundRequest });
  const kinds = application.documentsRequired.length ? application.documentsRequired : ["passport"];
  const requiredTotal = travelers.length * kinds.length;
  const requiredVerified = travelers.reduce(
    (sum, traveler) => sum + kinds.filter((kind) => reviewDocs.some((doc) => doc.travelerId === traveler.id && doc.kind === kind && doc.status === "verified")).length,
    0,
  );
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));

  const act = (action: StepAction) => {
    if (action.kind === "tab") {
      setTab(action.tab);
      requestAnimationFrame(() => document.getElementById("detail-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else if (action.kind === "status") {
      setTarget(action.status);
      requestAnimationFrame(() => document.getElementById("status-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } else {
      document.getElementById(`${action.target}-panel`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const tabs: { id: DetailTab; label: string; badge?: { value: string; tone: Tone } }[] = [
    { id: "documents", label: "المستندات", badge: waitingReview ? { value: String(waitingReview), tone: "warning" } : { value: String(reviewDocs.length), tone: "neutral" } },
    { id: "travelers", label: "المسافرون", badge: { value: String(travelers.length), tone: "neutral" } },
    {
      id: "payment",
      label: "الدفع",
      badge: reviews.length ? { value: "!", tone: "danger" } : refundRequest?.status === "open" ? { value: "!", tone: "warning" } : undefined,
    },
    { id: "issued", label: "التأشيرة الصادرة", badge: issued.length ? { value: String(issued.length), tone: "success" } : application.status === "approved" ? { value: "!", tone: "warning" } : undefined },
    { id: "activity", label: "السجل", badge: { value: String(events.length + history.length), tone: "neutral" } },
  ];

  const details = application.visaDetails;
  const hours = application.express ? details?.expressHours ?? null : details?.processingHours ?? null;
  const optional = [
    { label: "المدة", value: hours === null ? "" : `${processingLabel(hours, "ar-EG")}${application.express ? " · سريع" : ""}` },
    { label: "الإقامة", value: details ? localizedPhrase(details.stay, "ar-EG", details.stayAr) : "" },
    { label: "الصلاحية", value: details ? localizedPhrase(details.validity, "ar-EG", details.validityAr) : "" },
    { label: "الدخول", value: details ? localizedPhrase(details.entry, "ar-EG", details.entryAr) : "" },
    { label: "الطريقة", value: details ? localizedPhrase(details.method, "ar-EG", details.methodAr) : "" },
  ].filter((row) => row.value);
  const visaRows: { label: string; value: ReactNode }[] = [
    { label: "النوع", value: application.visaLabelAr || application.visaLabel || <span className="text-muted-foreground">غير محدد</span> },
    ...optional,
    { label: "تاريخ السفر", value: application.departureDate ? <span className="font-mono tabular-nums">{application.departureDate}</span> : <span className="text-muted-foreground">غير محدد</span> },
    { label: "لغة رسائل العميل", value: application.locale?.startsWith("ar") ? "العربية" : "English" },
  ];

  return (
    <AdminPage
      title={application.reference}
      description={`أُنشئ \u2068${shortDateTime(application.createdAt)}\u2069 · \u2068${application.destinationName}\u2069${application.visaLabelAr || application.visaLabel ? ` · \u2068${application.visaLabelAr || application.visaLabel}\u2069` : ""}`}
      action={
        <>
          <Link href={href("/admin/queue", locale)} className={adminGhostClass}>
            الطابور
          </Link>
          <Link href={href("/admin/applications", locale)} className={adminGhostClass}>
            كل الطلبات
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 xl:grid-cols-5">
        <SummaryCell label="الحالة">
          <StatusBadge status={application.status} />
          <p className="mt-1.5 text-[11px] text-muted-foreground">آخر تحديث {relativeTime(application.updatedAt, new Date(now))}</p>
        </SummaryCell>
        <SummaryCell label="الموعد المضمون">
          <SlaText sla={sla} className="text-sm" />
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">{application.guaranteedAt ? shortDateTime(application.guaranteedAt) : "—"}</p>
        </SummaryCell>
        <SummaryCell label="الإجمالي">
          <p className="whitespace-nowrap font-mono text-lg font-semibold leading-tight tabular-nums">{formatMoney(application.totalAmount, application.currency)}</p>
          <p className={cn("mt-1 text-[11px]", application.status === "refunded" ? "text-amber-200" : paid ? "text-emerald-300" : "text-muted-foreground")}>
            {application.status === "refunded" ? "مسترد" : paid ? `مدفوع${refunded ? " · استرداد جزئي" : ""}` : "غير مدفوع"}
          </p>
          {application.paidAt ? <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{shortDateTime(application.paidAt)}</p> : null}
        </SummaryCell>
        <SummaryCell label="المسؤول">
          {assigneeName ? (
            <p className="truncate text-sm font-medium">
              {assigneeName}
              {application.assigneeId === currentUserId ? <span className="text-xs font-normal text-primary"> (أنت)</span> : null}
            </p>
          ) : (
            <p className="text-sm font-medium text-amber-200">غير معيّن</p>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {application.travelerCount} {application.travelerCount === 1 ? "مسافر" : "مسافرين"}
            {application.express ? " · سريع" : ""}
          </p>
        </SummaryCell>
        <SummaryCell label="المستندات المطلوبة" className="col-span-2 sm:col-span-1">
          <p className="font-mono text-lg font-semibold leading-tight tabular-nums">
            {requiredVerified}
            <span className="text-sm text-muted-foreground">/{requiredTotal}</span>
          </p>
          <div className="mt-1.5">
            <DocCounts
              signals={{
                verified: reviewDocs.filter((doc) => doc.status === "verified").length,
                uploaded: waitingReview,
                rejected: reviewDocs.filter((doc) => doc.status === "rejected").length,
                missing: gaps.filter((gap) => gap.reason === "missing").length,
                paymentReview: false,
                refundOpen: false,
              }}
            />
          </div>
        </SummaryCell>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <NextStepCard step={step.primary} also={step.also} onAction={act} />
          <StatusChanger locale={locale} application={application} readyToFile={readyToFile} target={target} onTarget={setTarget} />
          <AssignPanel key={application.assigneeId ?? "none"} locale={locale} application={application} assignees={staff} currentUserId={currentUserId} />
          <StaffFollowUp locale={locale} application={application} gaps={gaps.length} docsReady={readyToFile} />
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <CustomerCard locale={locale} application={application} customer={customer} now={now} />
            <AdminPanel
              title="التأشيرة"
              action={
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Flag src={application.destinationFlag} className="size-4" />
                  {application.destinationName}
                </span>
              }
            >
              <KeyValue items={visaRows} />
            </AdminPanel>
          </div>

          <div id="detail-tabs" className="scroll-mt-4 flex max-w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                  tab === item.id ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span
                    className={cn(
                      "rounded px-1.5 font-mono text-[11px] tabular-nums",
                      tab === item.id
                        ? "bg-primary-foreground/15"
                        : item.badge.tone === "danger"
                          ? "bg-rose-500/20 text-rose-200"
                          : item.badge.tone === "warning"
                            ? "bg-amber-400/20 text-amber-100"
                            : item.badge.tone === "success"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-muted text-foreground/80",
                    )}
                  >
                    {item.badge.value}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {tab === "documents" ? (
            <DocumentReview locale={locale} applicationId={application.id} documents={reviewDocs} travelers={travelers} required={application.documentsRequired} now={now} />
          ) : null}
          {tab === "travelers" ? <TravelerPanel locale={locale} travelers={travelers} today={today} departureDate={application.departureDate} /> : null}
          {tab === "payment" ? <PaymentPanel locale={locale} application={application} payments={payments} refundRequest={refundRequest} reviews={reviews} /> : null}
          {tab === "issued" ? <IssuedVisaPanel locale={locale} application={application} issued={issued} /> : null}
          {tab === "activity" ? <ActivityPanel locale={locale} applicationId={application.id} events={events} history={history} now={now} /> : null}
        </div>
      </div>
    </AdminPage>
  );
}

function SummaryCell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0 bg-card px-4 py-3", className)}>
      <p className="mb-1.5 text-[11px] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function NextStepCard({ step, also, onAction }: { step: NextStep; also: NextStep[]; onAction: (action: StepAction) => void }) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-s-2 bg-card", stepAccent[step.tone])}>
      <div className="p-5">
        <p className="text-[11px] font-medium text-muted-foreground">الخطوة التالية</p>
        <h2 className={cn("mt-1.5 text-base font-semibold", stepText[step.tone])}>{step.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
        {step.action ? (
          <button
            type="button"
            onClick={() => onAction(step.action!)}
            className={cn(
              "mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg text-sm font-semibold transition-opacity hover:opacity-90",
              step.tone === "danger" ? "bg-rose-500 text-white" : "bg-primary text-primary-foreground",
            )}
          >
            {step.action.label}
          </button>
        ) : null}
      </div>
      {also.length ? (
        <ul className="divide-y divide-border/70 border-t bg-background/30">
          {also.map((item) => (
            <li key={item.title} className="flex items-start gap-2.5 px-5 py-2.5">
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", stepDot[item.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
              {item.action ? (
                <button type="button" onClick={() => onAction(item.action!)} className="shrink-0 text-[11px] text-primary hover:underline">
                  {item.action.label}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CustomerCard({ locale, application, customer, now }: { locale: string; application: Application; customer: DetailCustomer | null; now: string }) {
  const email = customer?.email ?? application.userEmail ?? "";
  const phoneDigits = customer?.phone?.replace(/\D/g, "") ?? "";
  const whatsapp = phoneDigits.length >= 8 ? `https://wa.me/${phoneDigits.startsWith("0") ? `20${phoneDigits.slice(1)}` : phoneDigits}` : null;
  const name = customer?.fullName?.trim();
  return (
    <AdminPanel
      title="العميل"
      action={
        <Link href={href(`/admin/users/${application.userId}`, locale)} className="text-xs text-primary hover:underline">
          ملف العميل
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {(name || email || "?").trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name || "بدون اسم"}</p>
          <p className="text-[11px] text-muted-foreground">
            {customer ? `${customer.applications} ${customer.applications === 1 ? "طلب" : "طلبات"} · انضم ${relativeTime(customer.createdAt, new Date(now))}` : "—"}
          </p>
        </div>
        {customer?.banned ? <span className="ms-auto rounded border border-rose-500/40 px-1.5 text-[11px] text-rose-300">محظور</span> : null}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-muted-foreground">البريد</dt>
          <dd className="min-w-0 truncate">
            {email ? (
              <a href={`mailto:${email}`} className="hover:text-primary" dir="ltr">
                {email}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-muted-foreground">الهاتف</dt>
          <dd className="flex min-w-0 items-center gap-2">
            {customer?.phone ? (
              <>
                <a href={`tel:${customer.phone}`} className="truncate font-mono text-[13px] hover:text-primary" dir="ltr">
                  {customer.phone}
                </a>
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded border border-emerald-500/40 px-1.5 text-[11px] text-emerald-300 hover:bg-emerald-500/10">
                    واتساب
                  </a>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">غير مسجّل</span>
            )}
          </dd>
        </div>
      </dl>
    </AdminPanel>
  );
}
