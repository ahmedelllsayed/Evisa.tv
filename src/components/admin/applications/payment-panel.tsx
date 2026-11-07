"use client";

import Link from "next/link";
import { useState } from "react";
import { adminDeclineRefund, adminPartialRefund } from "@/app/actions/admin";
import { AdminNotice, AdminPanel, Pill, adminDangerClass, adminInputClass, adminThClass } from "@/components/admin/chrome";
import { ConfirmButton } from "@/components/admin/chrome-client";
import { shortDateTime } from "@/components/admin/format";
import { PaymentBadge } from "@/components/admin/status-badge";
import { href } from "@/lib/href";
import type { Application, ApplicationEvent, Payment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/visa";
import { FeedbackLine, useRun } from "./use-run";

const refundTone = { open: "warning", approved: "success", declined: "neutral" } as const;
const refundLabel = { open: "مفتوح", approved: "تم الاسترداد", declined: "مرفوض" } as const;

export function PaymentPanel({
  locale,
  application,
  payments,
  refundRequest,
  reviews,
}: {
  locale: string;
  application: Application;
  payments: Payment[];
  refundRequest: { status: "open" | "approved" | "declined"; reason: string } | null;
  reviews: ApplicationEvent[];
}) {
  const money = (amount: number) => formatMoney(amount, application.currency);
  const paidPayments = payments.filter((payment) => payment.status === "paid" || payment.status === "refunded");
  const paidTotal = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const refundedTotal = payments.reduce((sum, payment) => sum + payment.refundedAmount, 0);
  const refundable = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + Math.max(0, payment.amount - payment.refundedAmount), 0);
  const paid = payments.some((payment) => payment.status === "paid");
  const tiles = [
    { label: "الإجمالي", value: money(application.totalAmount), note: `${application.travelerCount} ${application.travelerCount === 1 ? "مسافر" : "مسافرين"}${application.express ? " · سريع" : ""}` },
    { label: "رسوم حكومية", value: money(application.govFee) },
    { label: "رسوم الخدمة", value: money(application.serviceFee) },
    { label: "المدفوع", value: money(paidTotal), note: application.paidAt ? shortDateTime(application.paidAt) : "لم يُدفع", tone: paidTotal ? "text-emerald-300" : "" },
    { label: "المسترد", value: money(refundedTotal), tone: refundedTotal ? "text-amber-200" : "" },
  ];

  return (
    <div className="space-y-4">
      {reviews.length ? (
        <div className="space-y-2">
          {reviews.map((review) => (
            <AdminNotice key={review.id} tone="danger">
              <p className="font-medium">دفعة تحتاج مراجعة · {shortDateTime(review.createdAt)}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90" dir="ltr">
                {review.description}
              </p>
            </AdminNotice>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground">{tile.label}</p>
            <p className={cn("mt-1 whitespace-nowrap font-mono text-base font-semibold tabular-nums", tile.tone)}>{tile.value}</p>
            {tile.note ? <p className="mt-0.5 text-[11px] text-muted-foreground">{tile.note}</p> : null}
          </div>
        ))}
      </div>

      <AdminPanel title="عمليات الدفع" hint="كل محاولة دفع بدأها العميل، الأحدث أولاً." flush>
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">لم يبدأ العميل أي عملية دفع.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead>
                <tr className="border-b">
                  <th className={adminThClass}>التاريخ</th>
                  <th className={adminThClass}>المزود</th>
                  <th className={adminThClass}>الحالة</th>
                  <th className={cn(adminThClass, "text-end")}>المبلغ</th>
                  <th className={adminThClass}>الإيصال والمرجع</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/70 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground tabular-nums">{shortDateTime(payment.createdAt)}</td>
                    <td className="px-4 py-3 text-xs capitalize">{payment.provider}</td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="block whitespace-nowrap font-mono text-[13px] tabular-nums">{money(payment.amount)}</span>
                      {payment.refundedAmount > 0 && payment.status !== "refunded" ? (
                        <span className="mt-0.5 block whitespace-nowrap text-[11px] text-amber-200">مسترد جزئياً {money(payment.refundedAmount)}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {payment.receiptNo ? <span className="block font-mono text-xs">{payment.receiptNo}</span> : null}
                      <span className="block max-w-[220px] truncate font-mono text-[11px] text-muted-foreground" dir="ltr" title={payment.providerRef ?? ""}>
                        {payment.transactionId ? `txn ${payment.transactionId}` : payment.providerRef || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {refundRequest ? <RefundRequestCard locale={locale} applicationId={application.id} request={refundRequest} /> : null}

      {paid && application.status !== "refunded" ? (
        <RefundForm locale={locale} applicationId={application.id} refundable={refundable} currency={application.currency} hasRequest={refundRequest?.status === "open"} />
      ) : null}
    </div>
  );
}

function RefundRequestCard({ locale, applicationId, request }: { locale: string; applicationId: string; request: { status: "open" | "approved" | "declined"; reason: string } }) {
  const { pending, run, feedback } = useRun();
  return (
    <AdminPanel
      title="طلب استرداد من العميل"
      action={
        <Pill tone={refundTone[request.status]} dot>
          {refundLabel[request.status]}
        </Pill>
      }
      className={request.status === "open" ? "border-amber-400/40" : undefined}
    >
      <blockquote className="border-s-2 border-border ps-3 text-sm leading-relaxed text-foreground/90">{request.reason || "بدون سبب مكتوب."}</blockquote>
      {request.status === "open" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ConfirmButton disabled={pending} onConfirm={() => run(() => adminDeclineRefund(locale, applicationId), "رُفض طلب الاسترداد وأُبلغ العميل.")} confirmLabel="تأكيد رفض الطلب">
            رفض طلب الاسترداد
          </ConfirmButton>
          <p className="text-xs text-muted-foreground">للموافقة نفّذ الاسترداد لدى مزود الدفع ثم سجّله بالأسفل.</p>
        </div>
      ) : null}
      <FeedbackLine feedback={feedback} className="mt-3" />
    </AdminPanel>
  );
}

function RefundForm({ locale, applicationId, refundable, currency, hasRequest }: { locale: string; applicationId: string; refundable: number; currency: string; hasRequest: boolean }) {
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pending, run, feedback } = useRun();
  const value = Number(amount);
  const over = amount.trim() !== "" && Number.isFinite(value) && value > refundable + 0.001;
  const full = amount.trim() !== "" && Math.abs(value - refundable) < 0.01;

  return (
    <AdminPanel
      title="تسجيل استرداد"
      hint={`نفّذ المبلغ لدى مزود الدفع أولاً، ثم سجّله هنا. المتاح للاسترداد ${formatMoney(refundable, currency)}.`}
      className={hasRequest ? "border-amber-400/30" : undefined}
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const raw = amount.trim();
          const parsed = Number(raw);
          if (!raw || !Number.isFinite(parsed) || parsed <= 0) {
            setError("اكتب مبلغ الاسترداد.");
            return;
          }
          if (!confirmed) {
            setError("أكّد الاسترداد قبل المتابعة.");
            return;
          }
          run(
            () => adminPartialRefund(locale, applicationId, parsed),
            (result) => ("partial" in result && result.partial ? "سُجّل استرداد جزئي." : "تم تعليم الدفعة كمستردة."),
            () => {
              setAmount("");
              setConfirmed(false);
            },
          );
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs text-muted-foreground">
            المبلغ ({currency})
            <input
              name="amount"
              required
              type="number"
              min="1"
              step="0.01"
              max={refundable || undefined}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              dir="ltr"
              className={cn(adminInputClass, "h-9 w-44 font-mono tabular-nums", over && "border-rose-500/70")}
            />
          </label>
          <button type="button" onClick={() => setAmount(String(refundable))} className="h-9 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
            كامل المتاح
          </button>
        </div>
        {over ? <p className="text-xs text-rose-300">أكبر من المتاح للاسترداد.</p> : amount.trim() ? <p className="text-xs text-muted-foreground">{full ? "استرداد كامل: يُغلق الطلب كمسترد ويُبلَّغ العميل." : "استرداد جزئي: يبقى الطلب على حالته."}</p> : null}
        <label className="flex items-start gap-2 text-sm">
          <input name="confirm" type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-rose-500" />
          <span>أؤكد أن المبلغ أُعيد فعلاً لدى مزود الدفع.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending || !confirmed || !amount.trim() || over} className={adminDangerClass}>
            {pending ? "جارٍ التسجيل…" : "تسجيل الاسترداد"}
          </button>
          <Link href={href("/transparency/refunds-policy", locale)} className="text-xs text-primary hover:underline">
            سياسة الاسترداد
          </Link>
        </div>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        <FeedbackLine feedback={feedback} />
      </form>
    </AdminPanel>
  );
}
