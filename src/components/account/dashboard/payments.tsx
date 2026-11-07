"use client";

import Link from "next/link";
import { CreditCard, ReceiptText, RotateCcw, Undo2 } from "lucide-react";
import type { UserPaymentRow } from "@/lib/account";
import type { Tone } from "@/lib/account-insights";
import { href } from "@/lib/href";
import { t, type MessageKey } from "@/lib/i18n";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateTime, formatMoney } from "@/lib/visa";
import { CopyText, EmptyState, Flag, Pill, cardClass, primaryButton, quietButton, receiptHref, say, secondaryButton } from "@/components/account/ui";
import { destinationName, sumByCurrency } from "./model";

type RefundStatus = "open" | "approved" | "declined";

const payStatus: Record<UserPaymentRow["status"], { key: MessageKey; tone: Tone }> = {
  pending: { key: "account.payPending", tone: "amber" },
  paid: { key: "account.payPaid", tone: "green" },
  failed: { key: "account.payFailed", tone: "red" },
  refunded: { key: "account.payRefunded", tone: "slate" },
};

function refundText(locale: string, status: RefundStatus) {
  if (status === "declined") return t(locale, "account.refundDeclined");
  if (status === "approved") return say(locale, "Refund approved.", "تمت الموافقة على طلب الاسترداد.");
  return say(locale, "Refund request under review.", "طلب الاسترداد قيد المراجعة.");
}

function money(rows: { amount: number; currency: string }[], locale: string) {
  const totals = sumByCurrency(rows);
  if (!totals.length) return formatMoney(0, undefined, locale);
  return totals.map((row) => formatMoney(row.amount, row.currency, locale)).join(" + ");
}

export function Payments({
  locale,
  apps,
  payments,
  refunds,
}: {
  locale: string;
  apps: Application[];
  payments: UserPaymentRow[];
  refunds: { applicationId: string; status: RefundStatus }[];
}) {
  if (!payments.length) {
    return (
      <EmptyState
        title={t(locale, "account.noPayments")}
        body={say(locale, "Receipts for every payment you make will be available here.", "ستجد هنا إيصال كل عملية دفع تقوم بها.")}
      />
    );
  }
  const byId = new Map(apps.map((app) => [app.id, app]));
  const refundByApp = new Map(refunds.map((refund) => [refund.applicationId, refund.status]));
  const settled = payments.filter((payment) => payment.status === "paid" || payment.status === "refunded");
  const refunded = payments
    .filter((payment) => payment.refundedAmount > 0 || payment.status === "refunded")
    .map((payment) => ({ amount: payment.refundedAmount || payment.amount, currency: payment.currency }));
  const summary = [
    { id: "paid", label: say(locale, "Total paid", "إجمالي المدفوع"), value: money(settled, locale), icon: CreditCard },
    { id: "refunded", label: say(locale, "Refunded", "المبالغ المستردة"), value: money(refunded, locale), icon: Undo2 },
    { id: "count", label: say(locale, "Payments", "عمليات الدفع"), value: String(payments.length), icon: ReceiptText },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className={cn(cardClass, "flex items-center gap-3 p-3 sm:p-4")}>
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:flex">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-ink">{item.label}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#16182b] tabular-nums sm:text-lg" title={item.value}>
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <ul className="grid gap-3">
        {payments.map((payment) => {
          const app = byId.get(payment.applicationId);
          const status = payStatus[payment.status];
          const refund = refundByApp.get(payment.applicationId);
          const retry = (payment.status === "failed" || payment.status === "pending") && app?.status === "payment_pending";
          return (
            <li key={payment.id} className={cn(cardClass, "p-4 sm:p-5")}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Flag src={app?.destinationFlag ?? null} className="size-10" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#16182b]">{app ? destinationName(app, locale) : payment.destinationName}</p>
                    <p className="text-xs text-muted-ink">{formatDateTime(payment.createdAt, locale)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className="text-base font-semibold text-[#16182b] tabular-nums">{formatMoney(payment.amount, payment.currency, locale)}</p>
                  <Pill tone={status.tone} dot>
                    {t(locale, status.key)}
                  </Pill>
                </div>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-ink">
                <div className="flex items-center gap-1.5">
                  <dt>{say(locale, "Application", "رقم الطلب")}:</dt>
                  <dd>
                    <CopyText value={payment.reference} locale={locale} />
                  </dd>
                </div>
                {payment.merchantOrderId ? (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <dt>{t(locale, "account.paymentRef")}:</dt>
                    <dd className="min-w-0">
                      <CopyText value={payment.merchantOrderId} locale={locale} className="max-w-full break-all text-start" />
                    </dd>
                  </div>
                ) : null}
                {payment.receiptNo ? (
                  <div className="flex items-center gap-1.5">
                    <dt>{say(locale, "Receipt no.", "رقم الإيصال")}:</dt>
                    <dd dir="ltr" className="font-mono">
                      {payment.receiptNo}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {payment.refundedAmount > 0 && payment.status !== "refunded" ? (
                <p className="mt-2 text-xs font-medium text-body">
                  {say(locale, "Refunded", "تم استرداد")} {formatMoney(payment.refundedAmount, payment.currency, locale)}
                </p>
              ) : null}
              {refund ? (
                <p
                  className={cn(
                    "mt-3 rounded-xl px-3 py-2 text-xs",
                    refund === "declined" ? "bg-rose-50 text-rose-700" : refund === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900",
                  )}
                >
                  {refundText(locale, refund)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {retry ? (
                  <Link href={href(`/apply/${payment.applicationId}`, locale)} className={cn(primaryButton, "h-9")}>
                    <RotateCcw aria-hidden className="size-4" />
                    {say(locale, "Retry payment", "إعادة محاولة الدفع")}
                  </Link>
                ) : null}
                {payment.receiptNo ? (
                  <a href={receiptHref(payment.id)} className={cn(secondaryButton, "h-9")} target="_blank" rel="noreferrer">
                    <ReceiptText aria-hidden className="size-4" />
                    {say(locale, "Download receipt", "تنزيل الإيصال")}
                  </a>
                ) : null}
                <Link href={href(`/account/applications/${payment.applicationId}`, locale)} className={quietButton}>
                  {say(locale, "View application", "عرض الطلب")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
