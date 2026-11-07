import Link from "next/link";
import type { ReactNode } from "react";
import { AdminAreaChart, AdminHoursChart, AdminRevenueChart } from "@/components/admin/admin-charts";
import { AdminPage, AdminPanel, PeriodSwitch, Pill, StatTile, adminGhostClass, type Tone } from "@/components/admin/chrome";
import { count, egp, statusTone } from "@/components/admin/format";
import { ActionStrip, type ActionCell } from "@/components/admin/insights/action-strip";
import { Funnel, buildFunnel, worstDrop } from "@/components/admin/insights/funnel";
import { Ltr } from "@/components/admin/insights/ltr";
import { dayLabel, fillDays, pct, pointsLabel, trend } from "@/components/admin/insights/math";
import { RankedList } from "@/components/admin/insights/ranked-list";
import { statusLabels } from "@/components/admin/status";
import { requireAdmin } from "@/lib/auth";
import { actionCounts, funnelCounts, periodComparison, staleSummary } from "@/lib/data/admin-overview";
import { queueCounts } from "@/lib/data/applications";
import { getInsights, insightDays } from "@/lib/data/insights";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { cn } from "@/lib/utils";

export const metadata = { title: "لوحة التحكم" };

const statusBar: Record<Tone, string> = {
  neutral: "bg-slate-500",
  info: "bg-sky-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

export default async function AdminHome({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await requireAdmin(locale);
  const days = insightDays(sp.days);
  const [counts, insights, stale, actions, comparison, funnelRows] = await Promise.all([
    queueCounts(user.id),
    getInsights(days),
    staleSummary(),
    actionCounts(),
    periodComparison(days),
    funnelCounts(days),
  ]);
  const link = (path: string) => href(path, locale);
  const now = actions.now;
  const previous = comparison.previous;

  const approval = pct(insights.approved, insights.approved + insights.rejected);
  const previousApproval = pct(previous.approved, previous.approved + previous.rejected);
  const refundRate = pct(insights.refunded, insights.paid + insights.refunded);
  const onTimeRate = pct(insights.onTime, insights.onTime + insights.late);

  const revenueDays = fillDays(insights.revenueDays, days, now, (day) => ({ day, revenue: 0, n: 0 }));
  const applicationDays = fillDays(insights.applicationDays, days, now, (day) => ({ day, n: 0 }));
  const processingDays = fillDays<{ day: string; hours: number | null }>(insights.processingDays, days, now, (day) => ({ day, hours: null }));
  const peak = insights.applicationDays.reduce<{ day: string; n: number } | null>((best, row) => (!best || row.n > best.n ? row : best), null);
  const bestRevenueDay = insights.revenueDays.reduce<{ day: string; revenue: number } | null>((best, row) => (!best || row.revenue > best.revenue ? row : best), null);
  const quietDays = revenueDays.filter((row) => row.revenue === 0).length;

  const steps = buildFunnel(funnelRows);
  const funnelTotal = steps.reduce((sum, step) => sum + step.n, 0);
  const drop = worstDrop(steps);
  const overall = pct(steps[steps.length - 1].n, steps[0].n);

  const actionItems: ActionCell[] = [
    { key: "late", label: "ملفات متأخرة عن الموعد", count: actions.late.count, oldest: actions.late.oldest, tone: "danger", href: link("/admin/queue?filter=late") },
    { key: "payment", label: "دفع يحتاج مراجعة", count: actions.paymentReview.count, oldest: actions.paymentReview.oldest, tone: "danger", href: link("/admin/queue") },
    { key: "unassigned", label: "مدفوعة بلا مسؤول", count: actions.unassignedPaid.count, oldest: actions.unassignedPaid.oldest, tone: "warning", href: link("/admin/queue?filter=unassigned") },
    { key: "refunds", label: "طلبات استرداد مفتوحة", count: actions.refunds.count, oldest: actions.refunds.oldest, tone: "warning", href: link("/admin/queue") },
    {
      key: "documents",
      label: "مستندات بانتظار المراجعة",
      count: actions.documents.count,
      oldest: actions.documents.oldest,
      tone: "info",
      detail: `في ${count(actions.documents.files)} ملف`,
      href: link("/admin/queue?filter=documents"),
    },
    { key: "messages", label: "رسائل غير مقروءة", count: actions.messages.count, oldest: actions.messages.oldest, tone: "info", href: link("/admin/messages") },
  ];

  const staff = insights.staff.filter((row) => row.processed > 0).slice(0, 7);
  const idleStaff = insights.staff.length - insights.staff.filter((row) => row.processed > 0).length;
  const statusTotal = insights.statuses.reduce((sum, row) => sum + row.n, 0);

  return (
    <AdminPage
      eyebrow="OVERVIEW"
      title="نظرة عامة"
      description={`ما ينتظر الفريق الآن، ثم أداء آخر ${days} يوماً مقارنةً بالفترة التي قبلها.`}
      action={<PeriodSwitch base={link("/admin")} days={days} />}
    >
      <ActionStrip
        items={actionItems}
        now={now}
        action={
          <>
            <Link href={link("/admin/queue?filter=mine")} className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
              طلباتي
              <span className="rounded bg-muted px-1.5 font-mono text-[11px] tabular-nums">{counts.mine}</span>
            </Link>
            <Link href={link("/admin/queue")} className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
              افتح الطابور
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label={`الإيراد خلال ${days} يوماً`}
          value={
            <>
              {count(insights.revenueNow)}
              <span className="ms-1.5 text-sm font-normal text-muted-foreground">EGP</span>
            </>
          }
          trend={trend(insights.revenueNow, insights.revenuePrevious)}
          note={
            insights.revenuePrevious ? (
              <>
                الفترة السابقة <Ltr>{egp(insights.revenuePrevious)}</Ltr>
              </>
            ) : (
              "لا إيراد في الفترة السابقة للمقارنة"
            )
          }
          href={link(`/admin/reports?days=${days}`)}
        />
        <StatTile
          label="طلبات جديدة"
          value={count(insights.applications)}
          trend={trend(insights.applications, previous.applications)}
          note={`الفترة السابقة ${count(previous.applications)} طلب`}
          href={link("/admin/applications")}
        />
        <StatTile
          label="معدل القبول"
          value={`${approval}%`}
          tone={insights.approved + insights.rejected === 0 ? "neutral" : approval >= 80 ? "success" : approval >= 60 ? "warning" : "danger"}
          note={
            insights.approved + insights.rejected === 0
              ? "لم يُحسم أي طلب في الفترة"
              : `${count(insights.approved)} مقبول · ${count(insights.rejected)} مرفوض · ${previous.approved + previous.rejected ? pointsLabel(approval, previousApproval) : "لا مقارنة"}`
          }
          href={link("/admin/applications?status=approved")}
        />
        <StatTile
          label="متوسط وقت المعالجة"
          value={
            <>
              {insights.avgHours.toFixed(1)}
              <span className="ms-1.5 text-sm font-normal text-muted-foreground">ساعة</span>
            </>
          }
          trend={trend(Math.round(insights.avgHours * 10), Math.round(previous.avgHours * 10), "down")}
          note={insights.onTime + insights.late ? `${onTimeRate}% أُغلقت في الموعد · ${count(insights.late)} متأخر` : "لا ملفات مغلقة في الفترة"}
          href={link("/admin/queue?filter=late")}
        />
        <StatTile
          label="نسبة الاسترداد"
          value={`${refundRate}%`}
          tone={refundRate >= 10 ? "warning" : "neutral"}
          note={`${count(insights.paid)} مدفوع · ${count(insights.refunded)} مسترد · ${count(insights.failed)} فشل`}
          href={link(`/admin/payments?days=${days}`)}
        />
        <StatTile
          label="تقييم الموقع"
          value={
            <>
              {insights.reviewCount ? insights.reviewRating.toFixed(1) : "—"}
              <span className="ms-1.5 text-sm font-normal text-muted-foreground">/ 5</span>
            </>
          }
          note={insights.reviewCount ? `${count(insights.reviewCount)} تقييم منشور في الفترة` : "لا تقييمات منشورة في الفترة"}
          href={link("/admin/reviews")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AdminPanel
          className="lg:col-span-2"
          title="الإيراد اليومي"
          hint={
            <>
              {count(insights.revenueDays.reduce((sum, row) => sum + row.n, 0))} طلب مدفوع بإجمالي <Ltr>{egp(insights.revenueNow)}</Ltr>
            </>
          }
          action={
            <Link href={link(`/admin/reports?days=${days}#report-revenue`)} className="text-xs text-primary hover:underline">
              التقرير
            </Link>
          }
        >
          {insights.revenueDays.length ? <AdminRevenueChart data={revenueDays} /> : <ChartEmpty>لا مدفوعات في هذه الفترة.</ChartEmpty>}
          {bestRevenueDay ? (
            <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
              {[
                { label: "أعلى يوم", value: egp(bestRevenueDay.revenue), note: dayLabel(bestRevenueDay.day) },
                { label: "متوسط اليوم", value: egp(insights.revenueNow / days), note: `على ${days} يوماً` },
                { label: "أيام بلا مدفوعات", value: count(quietDays), note: `من ${count(revenueDays.length)} يوماً` },
              ].map((item) => (
                <div key={item.label} className="min-w-0 bg-card px-4 py-3">
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="truncate font-mono text-base font-semibold tabular-nums">{item.value}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{item.note}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </AdminPanel>
        <AdminPanel
          title="مسار التحويل"
          hint={funnelTotal ? `التحويل الكلي ${overall}% · الشارة من الخطوة السابقة` : "نسبة الانتقال بين كل خطوة والتي تليها"}
          action={
            <Link href={link(`/admin/growth?days=${days}`)} className="text-xs text-primary hover:underline">
              التفاصيل
            </Link>
          }
        >
          {funnelTotal ? (
            <>
              <Funnel steps={steps} compact />
              {drop ? (
                <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-100/90">
                  أكبر تسرّب بين «{drop.from.label}» و«{drop.to.label}»: {drop.drop}%
                </p>
              ) : null}
            </>
          ) : (
            <ChartEmpty>لم تُسجَّل خطوات تحويل في هذه الفترة.</ChartEmpty>
          )}
        </AdminPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminPanel
          title="الطلبات اليومية"
          hint={
            peak ? (
              <>
                {count(insights.applications)} طلب · الذروة {count(peak.n)} في <Ltr>{dayLabel(peak.day)}</Ltr>
              </>
            ) : (
              "طلبات أُنشئت في الفترة"
            )
          }
        >
          {insights.applicationDays.length ? <AdminAreaChart data={applicationDays} /> : <ChartEmpty>لا طلبات في هذه الفترة.</ChartEmpty>}
          {statusTotal ? (
            <div className="mt-4 border-t pt-4">
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {insights.statuses.map((row) => (
                  <span key={row.label} className={statusBar[statusTone[row.label] ?? "neutral"]} style={{ width: `${(row.n / statusTotal) * 100}%` }} title={statusLabels[row.label] ?? row.label} />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {insights.statuses.map((row) => (
                  <li key={row.label} className="flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", statusBar[statusTone[row.label] ?? "neutral"])} />
                    {statusLabels[row.label] ?? row.label}
                    <span className="font-mono tabular-nums text-foreground/80">{row.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </AdminPanel>
        <AdminPanel
          title="متوسط وقت المعالجة بالساعات"
          hint={insights.processingDays.length ? `الخط المتقطع هو متوسط الفترة: ${insights.avgHours.toFixed(1)} ساعة` : "من إنشاء الطلب حتى القبول أو الرفض"}
        >
          {insights.processingDays.length ? <AdminHoursChart data={processingDays} average={Math.round(insights.avgHours * 10) / 10} /> : <ChartEmpty>لا ملفات مغلقة في هذه الفترة.</ChartEmpty>}
        </AdminPanel>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <AdminPanel title="أكثر الوجهات طلباً" hint="عدد الطلبات وإيرادها المدفوع في الفترة">
          <RankedList
            empty="لا طلبات في هذه الفترة."
            items={insights.destinations.map((row) => ({
              key: row.label,
              label: row.label,
              value: row.n,
              display: count(row.n),
              meta: row.revenue ? egp(row.revenue) : "غير مدفوع",
            }))}
          />
        </AdminPanel>
        <div className="space-y-4">
          <AdminPanel
            title="أداء الفريق"
            hint={idleStaff > 0 && staff.length ? `ملفات مغلقة لكل موظف · ${idleStaff} بلا ملفات مغلقة` : "ملفات مغلقة لكل موظف في الفترة"}
            action={
              <Link href={link("/admin/staff")} className="text-xs text-primary hover:underline">
                الفريق
              </Link>
            }
          >
            <RankedList
              tone="success"
              empty="لم يُغلق أي موظف ملفاً في هذه الفترة."
              items={staff.map((row) => ({
                key: row.label,
                label: row.label,
                value: row.processed,
                display: count(row.processed),
                meta: `قبول ${pct(row.approved, row.processed)}% · ${row.hours} س`,
              }))}
            />
          </AdminPanel>
          <StalePanel stale={stale} destinationsHref={link("/admin/destinations")} />
          <AdminPanel title="جنسيات المسافرين" hint="أكثر الجنسيات في طلبات الفترة">
            <RankedList
              ranked={false}
              tone="neutral"
              empty="لا جنسيات مسجّلة."
              items={insights.geography.slice(0, 5).map((row) => ({
                key: row.label,
                label: countryName(row.label),
                value: row.n,
                display: count(row.n),
              }))}
            />
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}

const regionNames = new Intl.DisplayNames(["ar"], { type: "region" });

function countryName(code: string) {
  if (!/^[A-Z]{2}$/i.test(code)) return code;
  try {
    return `${regionNames.of(code.toUpperCase()) ?? code} · ${code.toUpperCase()}`;
  } catch {
    return code;
  }
}

function ChartEmpty({ children }: { children: ReactNode }) {
  return <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{children}</div>;
}

function StalePanel({ stale, destinationsHref }: { stale: Awaited<ReturnType<typeof staleSummary>>; destinationsHref: string }) {
  if (stale.total === 0) {
    return (
      <AdminPanel title="متطلبات الوجهات">
        <p className="flex items-center gap-2 text-sm text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-400" />
          كل الوجهات النشطة رُوجعت خلال آخر ١٨٠ يوماً.
        </p>
      </AdminPanel>
    );
  }
  const rest = stale.total - stale.items.length;
  return (
    <AdminPanel
      title={
        <span className="flex items-center gap-2">
          متطلبات تحتاج مراجعة
          <Pill tone="warning" className="font-mono tabular-nums">
            {stale.total}
          </Pill>
        </span>
      }
      hint={stale.never ? "وجهات نشطة بلا تاريخ مراجعة، أو مضى عليه أكثر من ١٨٠ يوماً." : "مضى على آخر مراجعة أكثر من ١٨٠ يوماً."}
      action={
        <Link href={destinationsHref} className="text-xs text-primary hover:underline">
          الوجهات
        </Link>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {stale.items.map((item) => (
          <Link
            key={item.slug}
            href={destinationsHref}
            className="rounded-md border bg-background/60 px-2 py-1 text-xs text-foreground/90 transition-colors hover:border-primary/50"
          >
            {item.name}
          </Link>
        ))}
        {rest > 0 ? (
          <Link href={destinationsHref} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
            +{count(rest)} أخرى
          </Link>
        ) : null}
      </div>
    </AdminPanel>
  );
}
