import Link from "next/link";
import { AdminEmpty, AdminPage, AdminPanel, PeriodSwitch, Segmented, StatTile, adminGhostClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { count, egp, paymentLabel, paymentTone, shortDateTime } from "@/components/admin/format";
import { Ltr } from "@/components/admin/insights/ltr";
import { pct, trend } from "@/components/admin/insights/math";
import { RankedList } from "@/components/admin/insights/ranked-list";
import { PaymentBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/auth";
import { paymentBreakdown, paymentStatuses, periodComparison, recentPayments, type PaymentStatus } from "@/lib/data/admin-overview";
import { getInsights, insightDays, paymentGaps } from "@/lib/data/insights";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { cn } from "@/lib/utils";

export const metadata = { title: "المدفوعات" };

const methodLabels: Record<string, string> = {
  card: "بطاقة",
  wallet: "محفظة إلكترونية",
  kiosk: "دفع نقدي (أمان/مصاري)",
  cash: "نقدي",
  valu: "ValU",
  instapay: "InstaPay",
  manual: "يدوي",
  paymob: "Paymob",
  stripe: "Stripe",
};

function methodName(provider: string, method: string | null) {
  const key = (method ?? provider).toLowerCase();
  return methodLabels[key] ?? method ?? provider;
}

export default async function PaymentsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  const days = insightDays(sp.days);
  const status = paymentStatuses.find((value) => value === sp.status) ?? null;
  const [data, gaps, comparison, breakdown, recent] = await Promise.all([
    getInsights(days),
    paymentGaps(days),
    periodComparison(days),
    paymentBreakdown(days),
    recentPayments(days, status),
  ]);
  const link = (path: string) => href(path, locale);
  const { current, previous } = comparison;
  const filterHref = (value: PaymentStatus | null) => link(`/admin/payments?days=${days}${value ? `&status=${value}` : ""}#transactions`);

  const failureRate = pct(data.failed, data.paid + data.failed);
  const previousFailureRate = pct(previous.failed, previous.paidCount + previous.failed);
  const refundedTotal = breakdown.filter((row) => row.status === "refunded").reduce((sum, row) => sum + row.total, 0);
  const pendingTotal = breakdown.filter((row) => row.status === "pending").reduce((sum, row) => sum + row.total, 0);
  const attempts = breakdown.reduce((sum, row) => sum + row.n, 0);
  const statusCount: Record<PaymentStatus, number> = { paid: data.paid, pending: data.pending, failed: data.failed, refunded: data.refunded };

  const methods = [...breakdown
    .reduce((map, row) => {
      const key = methodName(row.provider, row.method);
      const entry = map.get(key) ?? { key, n: 0, paid: 0, paidTotal: 0, failed: 0 };
      entry.n += row.n;
      if (row.status === "paid") {
        entry.paid += row.n;
        entry.paidTotal += row.total;
      }
      if (row.status === "failed") entry.failed += row.n;
      map.set(key, entry);
      return map;
    }, new Map<string, { key: string; n: number; paid: number; paidTotal: number; failed: number }>())
    .values()].sort((a, b) => b.paidTotal - a.paidTotal || b.n - a.n);

  const statuses = paymentStatuses.map((value) => {
    const rows = breakdown.filter((row) => row.status === value);
    return { status: value, n: rows.reduce((sum, row) => sum + row.n, 0), total: rows.reduce((sum, row) => sum + row.total, 0) };
  });

  const gapRows = gaps.slice(0, 8).map((row) => {
    const payments = Number(row.payments);
    const applications = Number(row.applications);
    return { day: row.day, payments, applications, diff: payments - applications };
  });

  return (
    <AdminPage
      eyebrow="PAYMENTS"
      title="المدفوعات"
      description={`عمليات الدفع خلال آخر ${days} يوماً من سجل المدفوعات، ومطابقتها مع الطلبات المدفوعة.`}
      action={<PeriodSwitch base={link(status ? `/admin/payments?status=${status}` : "/admin/payments")} days={days} />}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="المحصّل"
          tone="success"
          value={
            <>
              {count(current.paidTotal)}
              <span className="ms-1.5 text-sm font-normal text-muted-foreground">EGP</span>
            </>
          }
          trend={trend(current.paidTotal, previous.paidTotal)}
          note={
            current.paidCount ? (
              <>
                متوسط العملية <Ltr>{egp(current.paidTotal / current.paidCount)}</Ltr>
              </>
            ) : (
              "لا عمليات ناجحة"
            )
          }
          href={filterHref("paid")}
        />
        <StatTile
          label="عمليات ناجحة"
          value={count(data.paid)}
          trend={trend(data.paid, previous.paidCount)}
          note={`من ${count(attempts)} محاولة في الفترة`}
          href={filterHref("paid")}
        />
        <StatTile
          label="نسبة الفشل"
          value={`${failureRate}%`}
          tone={failureRate >= 20 ? "danger" : failureRate >= 10 ? "warning" : "neutral"}
          note={`${count(data.failed)} فشل · الفترة السابقة ${previous.paidCount + previous.failed ? `${previousFailureRate}%` : "—"}`}
          href={filterHref("failed")}
        />
        <StatTile
          label="قيد الانتظار"
          value={count(data.pending)}
          tone={data.pending ? "warning" : "neutral"}
          note={
            data.pending ? (
              <>
                لم يكتمل أو لم يصل إشعاره · <Ltr>{egp(pendingTotal)}</Ltr>
              </>
            ) : (
              "لا عمليات معلّقة"
            )
          }
          href={filterHref("pending")}
        />
        <StatTile
          label="مسترد"
          value={count(data.refunded)}
          note={
            data.refunded ? (
              <>
                أُعيدت للعملاء · <Ltr>{egp(refundedTotal)}</Ltr>
              </>
            ) : (
              "لا استردادات في الفترة"
            )
          }
          href={filterHref("refunded")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <AdminPanel title="حسب وسيلة الدفع" hint="المبلغ المحصّل لكل وسيلة ونسبة نجاحها">
          <RankedList
            tone="success"
            empty="لا عمليات في هذه الفترة."
            items={methods.map((row) => ({
              key: row.key,
              label: row.key,
              value: row.paidTotal,
              display: egp(row.paidTotal),
              meta: `${count(row.n)} محاولة · نجاح ${pct(row.paid, row.paid + row.failed)}%`,
            }))}
          />
        </AdminPanel>
        <AdminPanel title="حسب الحالة" hint="اضغط على حالة لعرض عملياتها">
          {attempts === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا عمليات في هذه الفترة.</p>
          ) : (
            <RankedList
              ranked={false}
              empty=""
              items={statuses.map((row) => ({
                key: row.status,
                label: (
                  <span className="flex items-center gap-2">
                    {paymentLabel[row.status]}
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{pct(row.n, attempts)}%</span>
                  </span>
                ),
                value: row.n,
                display: count(row.n),
                meta: egp(row.total),
                tone: paymentTone[row.status],
                href: filterHref(row.status),
              }))}
            />
          )}
        </AdminPanel>
        <AdminPanel
          className="lg:col-span-2 xl:col-span-1"
          title="أيام غير متطابقة"
          hint="مجموع سجل الدفع يختلف عن مجموع الطلبات المدفوعة في اليوم نفسه"
        >
          {gapRows.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-400" />
              <p className="text-sm text-emerald-200">سجل الدفع يطابق الطلبات المدفوعة في كل أيام الفترة.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {gapRows.map((row) => (
                  <li key={row.day} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0">
                      <p className="font-mono text-xs tabular-nums">{row.day}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        دفع {count(row.payments)} · طلبات {count(row.applications)}
                      </p>
                    </div>
                    <span className={cn("shrink-0 font-mono text-sm font-medium tabular-nums", row.diff > 0 ? "text-amber-200" : "text-rose-300")}>
                      {row.diff > 0 ? "+" : "−"}
                      {count(Math.abs(row.diff))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                {gaps.length > gapRows.length ? `و${count(gaps.length - gapRows.length)} أيام أخرى. ` : ""}الموجب: مدفوعات بلا طلب مدفوع مقابلها. السالب: طلبات مدفوعة بلا عملية في السجل.
              </p>
            </>
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        id="transactions"
        title="أحدث العمليات"
        hint={`آخر ${recent.length < 50 ? count(recent.length) : "50"} عملية${status ? ` بحالة «${paymentLabel[status]}»` : ""} خلال ${days} يوماً`}
        action={
          <Segmented
            items={[
              { href: filterHref(null), label: "الكل", active: status === null, count: data.paid + data.pending + data.failed + data.refunded },
              ...paymentStatuses.map((value) => ({ href: filterHref(value), label: paymentLabel[value], active: status === value, count: statusCount[value] })),
            ]}
          />
        }
        flush
      >
        {recent.length === 0 ? (
          <div className="p-5">
            <AdminEmpty
              title={status ? `لا عمليات بحالة «${paymentLabel[status]}»` : "لا عمليات في هذه الفترة"}
              action={
                status ? (
                  <Link href={filterHref(null)} className={adminGhostClass}>
                    عرض كل الحالات
                  </Link>
                ) : days < 90 ? (
                  <Link href={link("/admin/payments?days=90#transactions")} className={adminGhostClass}>
                    عرض آخر 90 يوماً
                  </Link>
                ) : undefined
              }
            >
              جرّب فترة أطول أو حالة أخرى.
            </AdminEmpty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className={adminThClass}>الطلب</th>
                  <th className={adminThClass}>العميل</th>
                  <th className={adminThClass}>المبلغ</th>
                  <th className={adminThClass}>الوسيلة</th>
                  <th className={adminThClass}>الحالة</th>
                  <th className={adminThClass}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className={adminTrClass}>
                    <td className={adminTdClass}>
                      <Link href={link(`/admin/applications/${row.applicationId}`)} className="whitespace-nowrap font-mono text-xs font-medium text-primary hover:underline">
                        {row.reference}
                      </Link>
                    </td>
                    <td className={cn(adminTdClass, "max-w-[240px]")}>
                      <span className="block truncate text-muted-foreground" dir="ltr">
                        {row.email ?? "—"}
                      </span>
                    </td>
                    <td className={cn(adminTdClass, "whitespace-nowrap")}>
                      <span className="font-mono tabular-nums">
                        {count(row.amount)} <span className="text-[11px] text-muted-foreground">{row.currency}</span>
                      </span>
                      {row.refundedAmount > 0 ? <span className="block font-mono text-[11px] tabular-nums text-amber-200/80">مسترد {count(row.refundedAmount)}</span> : null}
                    </td>
                    <td className={cn(adminTdClass, "whitespace-nowrap text-muted-foreground")}>{methodName(row.provider, row.method)}</td>
                    <td className={adminTdClass}>
                      <PaymentBadge status={row.status} />
                    </td>
                    <td className={cn(adminTdClass, "whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground")}>{shortDateTime(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
