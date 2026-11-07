"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useLiveApplication } from "@/components/account/live-application";
import {
  BackLink,
  Card,
  CopyText,
  Flag,
  Pill,
  SectionTitle,
  StageTrack,
  StatusPill,
  bytes,
  fileHref,
  relativeDays,
  relativeTime,
  say,
  secondaryButton,
} from "@/components/account/ui";
import { DocumentsCard } from "@/components/account/tracker/documents";
import { localizeEvent } from "@/components/account/tracker/events";
import { PaymentCard, RefundCard, refundEligible, type RefundStatus } from "@/components/account/tracker/payment";
import { Timeline } from "@/components/account/tracker/timeline";
import { daysUntil, isClosedStatus, targetCountdown } from "@/lib/account-insights";
import { documentGaps } from "@/lib/application-rules";
import { href, visaHref } from "@/lib/href";
import { isArabicLocale, t } from "@/lib/i18n";
import { localizedVisaLabel } from "@/lib/localize";
import { nextStepText } from "@/lib/next-step";
import type { Application, ApplicationDocument, ApplicationEvent, Payment, Traveler } from "@/lib/types";
import { surfaceClass } from "@/components/motion/frame";
import { formatDate, formatMoney, processingLabel } from "@/lib/visa";
import { cn } from "@/lib/utils";

type Cta = { label: string; to: string; anchor?: boolean; onClick?: () => void };

function Fact({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "red" | "amber" | "green" }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl px-3.5 py-3",
        tone === "red" ? "bg-rose-50 ring-1 ring-rose-200 ring-inset" : tone === "amber" ? "bg-amber-50 ring-1 ring-amber-200 ring-inset" : "bg-surface",
      )}
    >
      <dt className="truncate text-xs text-muted-ink">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm font-semibold tabular-nums", tone === "red" ? "text-rose-800" : "text-[#16182b]")}>{value}</dd>
      {sub ? (
        <dd
          className={cn(
            "mt-0.5 truncate text-xs",
            tone === "red" ? "font-medium text-rose-700" : tone === "amber" ? "font-medium text-amber-800" : tone === "green" ? "font-medium text-emerald-700" : "text-muted-ink",
          )}
        >
          {sub}
        </dd>
      ) : null}
    </div>
  );
}

function VisaCard({ locale, application, files, readOnly }: { locale: string; application: Application; files: ApplicationDocument[]; readOnly: boolean }) {
  const issuedAt = application.deliveredAt ?? files[0]?.createdAt ?? null;
  return (
    <section id="visa" className="min-w-0 scroll-mt-24 rounded-[22px] border border-emerald-200 bg-linear-to-br from-emerald-50 via-white to-white p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden>
            <path d="m5 10.5 3.2 3.2L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[#16182b]">{say(locale, "Your visa is ready", "تأشيرتك جاهزة")}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-body">
            {issuedAt ? `${say(locale, "Issued", "صدرت في")} ${formatDate(issuedAt, locale)} · ` : ""}
            {say(locale, "Print a copy and keep it with your passport.", "اطبع نسخة واحتفظ بها مع جوازك.")}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {files.map((file) => (
          <li key={file.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[10px] font-semibold tracking-wide text-emerald-700">
              {(file.mimeType ?? "").includes("pdf") ? "PDF" : say(locale, "FILE", "ملف")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#16182b]" dir="auto">
                {file.fileName}
              </p>
              <p className="text-xs text-muted-ink">
                {[bytes(file.sizeBytes), formatDate(file.createdAt, locale)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <a
              href={fileHref(file.storagePath)}
              download={file.fileName}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <svg viewBox="0 0 20 20" fill="none" className="size-3.5" aria-hidden>
                <path d="M10 3.5v9m0 0 3.5-3.5M10 12.5 6.5 9M4 14v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t(locale, "account.download")}
            </a>
          </li>
        ))}
      </ul>
      {!readOnly ? (
        <a href={`/api/account/visas/${application.id}/zip`} className={cn(secondaryButton, "mt-3 h-9 text-xs")}>
          {say(locale, "Download all (ZIP)", "تحميل الكل (ZIP)")}
        </a>
      ) : null}
    </section>
  );
}

function SupportCard({ locale, reference, email, phone }: { locale: string; reference: string; email: string; phone: string }) {
  return (
    <Card>
      <SectionTitle
        title={say(locale, "Need help?", "تحتاج مساعدة؟")}
        hint={say(locale, `Mention ${reference} so we find your file fast.`, `اذكر رقم الطلب ${reference} لنصل لملفك بسرعة.`)}
      />
      <div className="mt-4 grid gap-2">
        <Link href={href("/contact", locale)} className={cn(secondaryButton, "w-full")}>
          {say(locale, "Contact support", "تواصل مع الدعم")}
        </Link>
        <div className="flex min-w-0 flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {email ? (
            <a href={`mailto:${email}?subject=${encodeURIComponent(reference)}`} className="truncate font-medium text-brand-700 hover:underline" dir="ltr">
              {email}
            </a>
          ) : null}
          {phone ? (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-medium text-brand-700 hover:underline" dir="ltr">
              {phone}
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function ApplicationTracker({
  locale,
  application,
  destinationName: destination,
  events,
  documents,
  travelers,
  payments,
  refundStatus = null,
  now,
  readOnly = false,
  support,
  offer,
}: {
  locale: string;
  application: Application;
  destinationName: string;
  events: ApplicationEvent[];
  documents: ApplicationDocument[];
  travelers: Traveler[];
  payments: Payment[];
  refundStatus?: RefundStatus;
  now: number;
  readOnly?: boolean;
  support: { email: string; phone: string };
  offer?: ReactNode;
}) {
  const app = application;
  const arabic = isArabicLocale(locale);
  const issued = documents.filter((document) => document.kind === "issued_visa");
  const closed = isClosedStatus(app.status);
  const live = !closed || (app.status === "approved" && !issued.length);
  useLiveApplication(app.id, live);
  const [refundOpen, setRefundOpen] = useState(false);

  const visaLabel = app.visaLabel ? localizedVisaLabel(app, locale) : "";
  const countdown = targetCountdown(app.status, app.guaranteedAt, new Date(now));
  const gaps = documentGaps(
    app.documentsRequired,
    travelers,
    documents.filter((document) => document.kind !== "issued_visa"),
  );
  const rejectedCount = gaps.filter((gap) => gap.reason === "rejected").length;
  const missingCount = gaps.length - rejectedCount;
  const canRefund = !readOnly && refundEligible(app) && !refundStatus;
  const money = (amount: number) => formatMoney(amount, app.currency, locale);
  const entries = [...events].reverse().map((event) => localizeEvent(event, app, locale, destination));

  const openRefund = () => setRefundOpen(true);
  let nextText = nextStepText(app.status, arabic);
  let cta: Cta | null = null;
  if (app.status === "draft") cta = { label: t(locale, "account.continue"), to: href(`/apply/${app.id}`, locale) };
  else if (app.status === "payment_pending") cta = { label: say(locale, "Complete payment", "أكمل الدفع"), to: href(`/apply/${app.id}`, locale) };
  else if (!closed && rejectedCount) {
    nextText = say(
      locale,
      rejectedCount === 1 ? "One document needs a new copy. Upload it below and we continue right away." : `${rejectedCount} documents need a new copy. Upload them below and we continue right away.`,
      rejectedCount === 1 ? "مستند واحد يحتاج نسخة جديدة. ارفعه بالأسفل لنكمل فوراً." : `${rejectedCount} مستندات تحتاج نسخاً جديدة. ارفعها بالأسفل لنكمل فوراً.`,
    );
    cta = { label: say(locale, "Fix documents", "أصلح المستندات"), to: "#documents", anchor: true };
  } else if (!closed && missingCount) {
    nextText = say(locale, "A required document is missing from the file.", "ينقص الملف مستند مطلوب.");
    cta = { label: say(locale, "See documents", "عرض المستندات"), to: "#documents", anchor: true };
  } else if (app.status === "approved" && issued.length) {
    nextText = say(locale, "Your visa is ready. Download it and keep a printed copy with your passport.", "تأشيرتك جاهزة. حمّلها واحتفظ بنسخة مطبوعة مع جوازك.");
    cta = { label: say(locale, "Download visa", "تحميل التأشيرة"), to: "#visa", anchor: true };
  } else if (app.status === "rejected" || app.status === "refunded" || app.status === "cancelled") {
    cta = { label: t(locale, "account.reapply"), to: visaHref(app.destinationSlug, locale) };
  } else if (countdown?.late && canRefund) {
    nextText = say(
      locale,
      "We passed the target date. The team is still on it, and you can ask for a refund.",
      "تجاوزنا الموعد المستهدف. الفريق ما زال يتابع الطلب، ويمكنك طلب استرداد.",
    );
    cta = { label: t(locale, "account.refund"), to: "#refund", anchor: true, onClick: openRefund };
  }
  if (readOnly) cta = null;

  const hours = app.express ? (app.visaDetails?.expressHours ?? app.visaDetails?.processingHours ?? null) : (app.visaDetails?.processingHours ?? null);
  const departureDays = daysUntil(app.departureDate, new Date(now));
  const targetAfterTrip =
    !closed && app.departureDate && app.guaranteedAt && new Date(app.guaranteedAt).getTime() > new Date(`${app.departureDate}T23:59:59`).getTime();
  const onTimeDelivery = app.deliveredAt && app.guaranteedAt ? new Date(app.deliveredAt).getTime() <= new Date(app.guaranteedAt).getTime() : null;
  const names = travelers.map((traveler) => traveler.firstName).filter(Boolean).join(arabic ? "، " : ", ");
  const travellerCount = travelers.length || app.travelerCount;

  let target: ReactNode;
  if (app.status === "draft" || app.status === "payment_pending") {
    target = (
      <Fact
        label={t(locale, "account.guaranteed")}
        value={say(locale, "Set at payment", "يُحدد عند الدفع")}
        sub={hours !== null ? say(locale, `About ${processingLabel(hours, locale)} after paying`, `حوالي ${processingLabel(hours, locale)} بعد الدفع`) : undefined}
      />
    );
  } else if (countdown) {
    target = (
      <Fact
        label={t(locale, "account.guaranteed")}
        value={formatDate(app.guaranteedAt!, locale)}
        sub={countdown.late ? `${say(locale, "Late", "متأخر")} · ${relativeTime(locale, app.guaranteedAt!, now)}` : relativeDays(locale, countdown.days)}
        tone={countdown.late ? "red" : countdown.days <= 1 ? "amber" : undefined}
      />
    );
  } else if (app.status === "approved" && app.deliveredAt) {
    target = (
      <Fact
        label={say(locale, "Delivered", "تاريخ التسليم")}
        value={formatDate(app.deliveredAt, locale)}
        sub={onTimeDelivery === null ? undefined : onTimeDelivery ? t(locale, "account.onTime") : say(locale, "After the target date", "بعد الموعد المستهدف")}
        tone={onTimeDelivery ? "green" : undefined}
      />
    );
  } else {
    target = <Fact label={t(locale, "account.guaranteed")} value={app.guaranteedAt ? formatDate(app.guaranteedAt, locale) : "—"} />;
  }

  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:py-10", surfaceClass(locale))}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <BackLink locale={locale} to={href("/account", locale)}>
          {t(locale, "account.back")}
        </BackLink>
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-ink">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {say(locale, "Updates live", "يتحدّث تلقائياً")}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card className="sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <Flag src={app.destinationFlag} className="size-12 sm:size-14" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-[#16182b] sm:text-[28px]">{destination}</h1>
                  <StatusPill status={app.status} locale={locale} />
                </div>
                <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-body">
                  {visaLabel ? <span className="min-w-0">{visaLabel}</span> : null}
                  {app.express ? <Pill tone="amber">{say(locale, "Express", "سريع")}</Pill> : null}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-ink">
                  {say(locale, "Reference", "رقم الطلب")}
                  <CopyText value={app.reference} locale={locale} />
                </p>
              </div>
            </div>
            <StageTrack status={app.status} locale={locale} className="mt-6" />
            <dl className="mt-6 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {target}
              <Fact
                label={say(locale, "Departure", "موعد السفر")}
                value={app.departureDate ? formatDate(app.departureDate, locale) : "—"}
                sub={
                  !app.departureDate
                    ? say(locale, "Not set", "غير محدد")
                    : targetAfterTrip
                      ? say(locale, "Target is after your trip", "الموعد بعد سفرك")
                      : !closed && departureDays !== null && departureDays >= 0
                        ? relativeDays(locale, departureDays)
                        : undefined
                }
                tone={targetAfterTrip ? "amber" : undefined}
              />
              <Fact label={t(locale, "account.travelers")} value={travellerCount} sub={names || undefined} />
              <Fact
                label={t(locale, "account.total")}
                value={money(app.totalAmount)}
                sub={app.paidAt ? t(locale, "account.payPaid") : say(locale, "Not paid yet", "لم يُدفع بعد")}
                tone={app.paidAt ? "green" : undefined}
              />
            </dl>
            {countdown?.late ? (
              <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200 ring-inset">
                <p className="min-w-0 text-sm leading-relaxed text-rose-800">
                  <span className="font-semibold">{t(locale, "account.late")}.</span>{" "}
                  {refundStatus === "open"
                    ? say(locale, "Your refund request is under review.", "طلب الاسترداد قيد المراجعة.")
                    : canRefund
                      ? say(locale, "You can ask for a refund.", "يمكنك طلب استرداد.")
                      : say(locale, "The team is working on it now.", "الفريق يتابع الطلب الآن.")}
                </p>
                {canRefund ? (
                  <a href="#refund" onClick={openRefund} className="shrink-0 text-sm font-semibold text-rose-700 underline-offset-4 hover:underline">
                    {t(locale, "account.refund")}
                  </a>
                ) : null}
              </div>
            ) : null}
          </Card>

          <section className="min-w-0 rounded-[22px] bg-[#16182b] p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#ffd873]">{t(locale, "account.next")}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/90">{nextText}</p>
            </div>
            {cta ? (
              cta.anchor ? (
                <a href={cta.to} onClick={cta.onClick} className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#ffd873] px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:mt-0">
                  {cta.label}
                </a>
              ) : (
                <Link href={cta.to} className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#ffd873] px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:mt-0">
                  {cta.label}
                </Link>
              )
            ) : null}
          </section>

          {issued.length ? <VisaCard locale={locale} application={app} files={issued} readOnly={readOnly} /> : null}

          <DocumentsCard locale={locale} application={app} travelers={travelers} documents={documents} readOnly={readOnly} />
        </div>

        <aside className="min-w-0 space-y-5 lg:row-span-2">
          <PaymentCard locale={locale} application={app} payments={payments} readOnly={readOnly} />
          <RefundCard locale={locale} application={app} refundStatus={refundStatus} open={refundOpen} onToggle={setRefundOpen} readOnly={readOnly} />
          <SupportCard locale={locale} reference={app.reference} email={support.email} phone={support.phone} />
          {offer}
        </aside>

        <div className="min-w-0 lg:col-start-1">
          <Timeline locale={locale} entries={entries} now={now} />
        </div>
      </div>
    </div>
  );
}
