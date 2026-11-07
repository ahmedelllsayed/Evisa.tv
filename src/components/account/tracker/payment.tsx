"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { requestRefundAction } from "@/app/actions/inbox";
import { Card, Pill, SectionTitle, inputClass, primaryButton, receiptHref, say, secondaryButton } from "@/components/account/ui";
import type { Tone } from "@/lib/account-insights";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import type { Application, Payment } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/visa";
import { cn } from "@/lib/utils";

export type RefundStatus = "open" | "approved" | "declined" | null;

const MIN_REASON = 8;

export function refundEligible(application: Application) {
  return Boolean(application.paidAt) && !["refunded", "cancelled", "draft"].includes(application.status);
}

function Line({ label, value, strong, className }: { label: ReactNode; value: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-baseline justify-between gap-3 py-1.5 text-sm", className)}>
      <dt className={cn("min-w-0", strong ? "font-semibold text-[#16182b]" : "text-muted-ink")}>{label}</dt>
      <dd className={cn("shrink-0 tabular-nums", strong ? "text-base font-semibold text-[#16182b]" : "text-[#16182b]")}>{value}</dd>
    </div>
  );
}

export function PaymentCard({
  locale,
  application,
  payments,
  readOnly,
}: {
  locale: string;
  application: Application;
  payments: Payment[];
  readOnly: boolean;
}) {
  const money = (amount: number) => formatMoney(amount, application.currency, locale);
  const record = payments.find((payment) => payment.status === "paid" || payment.status === "refunded") ?? payments[0] ?? null;
  const refunded = payments.reduce((sum, payment) => sum + (payment.refundedAmount || 0), 0);
  const [status, tone]: [string, Tone] =
    application.status === "refunded" || record?.status === "refunded"
      ? [t(locale, "account.payRefunded"), "slate"]
      : refunded > 0
        ? [say(locale, "Partly refunded", "مسترد جزئياً"), "amber"]
        : application.paidAt
          ? [t(locale, "account.payPaid"), "green"]
          : record?.status === "failed"
            ? [t(locale, "account.payFailed"), "red"]
            : application.status === "payment_pending"
              ? [t(locale, "account.payPending"), "amber"]
              : [say(locale, "Not paid yet", "لم يُدفع بعد"), "slate"];
  const embassyFee = application.govFee === 0 && application.visaDetails?.embassyVisit;
  return (
    <Card>
      <SectionTitle title={say(locale, "Payment", "الدفع")} action={<Pill tone={tone} dot>{status}</Pill>} />
      <dl className="mt-3">
        <Line
          label={say(locale, "Government fee", "رسوم الجهة الحكومية")}
          value={embassyFee ? <span className="text-xs text-muted-ink">{say(locale, "Paid at the embassy", "تُدفع في السفارة")}</span> : money(application.govFee)}
        />
        <Line
          label={application.express ? say(locale, "Service fee · Express", "رسوم الخدمة · سريع") : say(locale, "Service fee", "رسوم الخدمة")}
          value={money(application.serviceFee)}
        />
        <Line label={t(locale, "account.total")} value={money(application.totalAmount)} strong className="mt-1 border-t border-dashed border-[#e3e5f2] pt-2.5" />
        {application.paidAt ? <Line label={say(locale, "Paid on", "تاريخ الدفع")} value={formatDate(application.paidAt, locale)} /> : null}
        {refunded > 0 ? <Line label={say(locale, "Refunded", "المبلغ المسترد")} value={<span className="text-emerald-700">{money(refunded)}</span>} /> : null}
        {record?.receiptNo ? <Line label={say(locale, "Receipt no.", "رقم الإيصال")} value={<span className="font-mono text-xs" dir="ltr">{record.receiptNo}</span>} /> : null}
      </dl>
      {!readOnly && record?.receiptNo ? (
        <a href={receiptHref(record.id)} download className={cn(secondaryButton, "mt-4 w-full")}>
          <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
            <path d="M10 3.5v9m0 0 3.5-3.5M10 12.5 6.5 9M4 14v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {say(locale, "Download receipt (PDF)", "تحميل الإيصال (PDF)")}
        </a>
      ) : null}
      {!readOnly && !application.paidAt && (application.status === "draft" || application.status === "payment_pending") ? (
        <Link href={href(`/apply/${application.id}`, locale)} className={cn(primaryButton, "mt-4 w-full")}>
          {application.status === "payment_pending" ? say(locale, "Complete payment", "أكمل الدفع") : t(locale, "account.continue")}
        </Link>
      ) : null}
    </Card>
  );
}

export function RefundCard({
  locale,
  application,
  refundStatus,
  open,
  onToggle,
  readOnly,
}: {
  locale: string;
  application: Application;
  refundStatus: RefundStatus;
  open: boolean;
  onToggle: (open: boolean) => void;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [sent, setSent] = useState<RefundStatus>(null);
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const status = sent ?? refundStatus;
  const length = reason.trim().length;
  const short = length < MIN_REASON;

  if (status) {
    const view: Record<Exclude<RefundStatus, null>, { tone: Tone; title: string; body: string }> = {
      open: {
        tone: "amber",
        title: say(locale, "Refund request under review", "طلب الاسترداد قيد المراجعة"),
        body: t(locale, "account.refundSent"),
      },
      approved: {
        tone: "green",
        title: say(locale, "Refund approved", "تمت الموافقة على الاسترداد"),
        body: say(locale, "The amount goes back to the original payment method. Banks can take a few working days.", "يعود المبلغ إلى وسيلة الدفع الأصلية. قد يستغرق البنك بضعة أيام عمل."),
      },
      declined: {
        tone: "slate",
        title: t(locale, "account.refundDeclined"),
        body: say(locale, "Contact us if you want to talk it through.", "تواصل معنا إن أردت مناقشة القرار."),
      },
    };
    const item = view[status];
    return (
      <Card id="refund" className="scroll-mt-24">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-[#16182b]">{item.title}</p>
          <Pill tone={item.tone} dot>
            {status === "open" ? say(locale, "Open", "مفتوح") : status === "approved" ? say(locale, "Approved", "مقبول") : say(locale, "Declined", "مرفوض")}
          </Pill>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-ink">{item.body}</p>
      </Card>
    );
  }

  if (readOnly || !refundEligible(application)) return null;

  return (
    <Card id="refund" className="scroll-mt-24 p-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="refund-form"
        onClick={() => onToggle(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-[22px] px-5 py-4 text-start transition-colors hover:bg-surface/60"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#16182b]">{t(locale, "account.refund")}</span>
          <span className="mt-0.5 block text-xs text-muted-ink">{say(locale, "A staff member reviews every request.", "يراجع أحد الموظفين كل طلب.")}</span>
        </span>
        <svg viewBox="0 0 20 20" fill="none" className={cn("size-4 shrink-0 text-muted-ink transition-transform", open && "rotate-180")} aria-hidden>
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <form
          id="refund-form"
          className="grid gap-3 border-t border-[#eceef6] px-5 pt-4 pb-5"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (short || !agreed) return;
            setError(null);
            start(async () => {
              const result = await requestRefundAction(locale, application.id, reason);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setSent(result.status);
              router.refresh();
            });
          }}
        >
          <label className="grid gap-1.5 text-sm font-medium text-[#16182b]">
            {t(locale, "account.refundReason")}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              rows={4}
              maxLength={1000}
              aria-invalid={touched && short}
              aria-describedby="refund-count"
              placeholder={say(locale, "For example: the visa did not arrive by the target date.", "مثلاً: لم تصل التأشيرة في الموعد المستهدف.")}
              className={cn(inputClass, "h-auto resize-y py-2.5 leading-relaxed")}
            />
          </label>
          <p id="refund-count" className={cn("-mt-1.5 text-xs tabular-nums", touched && short ? "text-rose-700" : "text-muted-ink")}>
            {short
              ? say(locale, `At least ${MIN_REASON} characters · ${length}/${MIN_REASON}`, `${MIN_REASON} أحرف على الأقل · ${length}/${MIN_REASON}`)
              : say(locale, `${length} characters`, `${length} حرفاً`)}
          </p>
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-body">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--brand-500)]" />
            <span>
              {say(locale, "I understand staff review the request before any money is returned. ", "أفهم أن الفريق يراجع الطلب قبل إعادة أي مبلغ. ")}
              <Link href={href("/transparency/refunds-policy", locale)} target="_blank" className="font-medium text-brand-700 hover:underline">
                {say(locale, "Refunds policy", "سياسة الاسترداد")}
              </Link>
            </span>
          </label>
          {error ? (
            <p role="alert" className="text-xs font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || short || !agreed} className={primaryButton}>
              {pending ? say(locale, "Sending…", "جارٍ الإرسال…") : say(locale, "Send refund request", "أرسل طلب الاسترداد")}
            </button>
            <button type="button" onClick={() => onToggle(false)} className={secondaryButton}>
              {say(locale, "Cancel", "إلغاء")}
            </button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
