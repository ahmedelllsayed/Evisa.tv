import Link from "next/link";
import { AdminEmpty, AdminNotice, AdminPage, AdminPanel, Bar, PeriodSwitch, StatTile, adminGhostClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { count } from "@/components/admin/format";
import { Funnel, buildFunnel, eventLabels, worstDrop } from "@/components/admin/insights/funnel";
import { Ltr } from "@/components/admin/insights/ltr";
import { change, pct, pointsLabel, trend } from "@/components/admin/insights/math";
import { requireAdmin } from "@/lib/auth";
import { funnelByDestination, funnelCounts, funnelCoverage } from "@/lib/data/admin-overview";
import { insightDays } from "@/lib/data/insights";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { cn } from "@/lib/utils";

export const metadata = { title: "القياس" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", day: "2-digit", month: "short", year: "numeric" });

export default async function GrowthPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  const days = insightDays(sp.days);
  const [rows, destinations, coverage] = await Promise.all([funnelCounts(days), funnelByDestination(days), funnelCoverage(days)]);
  const link = (path: string) => href(path, locale);

  const steps = buildFunnel(rows);
  const compare = !coverage.previousPartial;
  const byName = new Map(rows.map((row) => [row.name, row]));
  const value = (name: string) => byName.get(name) ?? { name, now: 0, previous: 0 };
  const total = rows.reduce((sum, row) => sum + row.now, 0);
  const totalPrevious = rows.reduce((sum, row) => sum + row.previous, 0);
  const events = [...rows].filter((row) => row.now > 0 || row.previous > 0).sort((a, b) => b.now - a.now || b.previous - a.previous);
  const maxEvent = Math.max(...events.map((row) => row.now), 0);

  const views = value("view_visa");
  const begins = value("begin_application");
  const success = value("payment_success");
  const failed = value("payment_failed");
  const offers = value("offer_click");
  const overall = pct(success.now, views.now);
  const overallPrevious = pct(success.previous, views.previous);
  const failureRate = pct(failed.now, failed.now + success.now);
  const drop = worstDrop(steps);
  const optionalTrend = (now: number, previous: number) => (compare ? trend(now, previous) : null);

  return (
    <AdminPage
      eyebrow="GROWTH"
      title="القياس"
      description={`أين يتوقف الزوار بين مشاهدة صفحة الدولة وإتمام الدفع خلال آخر ${days} يوماً، مقارنةً بالفترة السابقة.`}
      action={
        <>
          <Link href={link("/admin/queue?filter=followup")} className={adminGhostClass}>
            قائمة المتابعة
          </Link>
          <PeriodSwitch base={link("/admin/growth")} days={days} />
        </>
      }
    >
      {coverage.first === null ? (
        <AdminNotice tone="info">
          <p>لم يُسجَّل أي حدث بعد. تظهر الأرقام هنا بعد أول زيارة لصفحة دولة.</p>
        </AdminNotice>
      ) : coverage.partial ? (
        <AdminNotice tone="warning">
          <p>
            بدأ القياس في <Ltr>{dateFormat.format(new Date(coverage.first))}</Ltr>، أي داخل هذه الفترة. الأرقام لا تغطي كل الأيام، والمقارنة بالفترة السابقة غير متاحة.
          </p>
        </AdminNotice>
      ) : coverage.previousPartial ? (
        <AdminNotice tone="info">
          <p>
            بدأ القياس في <Ltr>{dateFormat.format(new Date(coverage.first))}</Ltr>. الفترة السابقة غير مكتملة، لذلك أُخفيت نسب التغيّر.
          </p>
        </AdminNotice>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="مجموع الأحداث" value={count(total)} trend={optionalTrend(total, totalPrevious)} note={compare ? `الفترة السابقة ${count(totalPrevious)}` : "كل الأحداث المسجّلة في الفترة"} />
        <StatTile label="مشاهدات صفحات الدول" value={count(views.now)} trend={optionalTrend(views.now, views.previous)} note="بداية المسار" />
        <StatTile label="طلبات بدأت" value={count(begins.now)} trend={optionalTrend(begins.now, begins.previous)} note={`${pct(begins.now, views.now)}% من المشاهدات`} />
        <StatTile label="دفعات ناجحة" value={count(success.now)} tone={success.now ? "success" : "neutral"} trend={optionalTrend(success.now, success.previous)} note={failed.now ? `${count(failed.now)} محاولة فاشلة` : "بلا محاولات فاشلة"} />
        <StatTile
          label="التحويل الكلي"
          value={`${overall}%`}
          tone="info"
          note={compare && views.previous ? pointsLabel(overall, overallPrevious) : "من المشاهدة إلى الدفع"}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPanel
          title="مسار التحويل"
          hint="النسبة بين كل خطوتين هي من انتقل من الخطوة السابقة. العمود الأخير نسبة الخطوة من المشاهدات."
          action={compare ? <span className="text-[11px] text-muted-foreground">▲▼ مقارنة بالفترة السابقة</span> : null}
        >
          {total === 0 ? <AdminEmpty title="لا أحداث في هذه الفترة">جرّب فترة أطول.</AdminEmpty> : <Funnel steps={steps} comparePrevious={compare} />}
        </AdminPanel>

        <div className="space-y-4">
          <AdminPanel title="أين نخسر أكثر">
            {drop ? (
              <div>
                <p className="font-mono text-3xl font-semibold tabular-nums text-amber-200">{drop.drop}%</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  يتوقفون بين «<span className="text-foreground">{drop.from.label}</span>» و«<span className="text-foreground">{drop.to.label}</span>». هذه أولى خطوة تستحق التحسين.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا يوجد تسرّب يمكن قياسه في هذه الفترة.</p>
            )}
          </AdminPanel>
          <AdminPanel title="صحة الدفع" hint="من بدأ الدفع ولم يُكمله">
            <div className="flex items-baseline justify-between gap-3">
              <p className={cn("font-mono text-3xl font-semibold tabular-nums", failureRate >= 20 ? "text-rose-300" : failureRate >= 10 ? "text-amber-200" : "text-emerald-300")}>{failureRate}%</p>
              <p className="text-xs text-muted-foreground">نسبة الفشل</p>
            </div>
            <div className="mt-3">
              <Bar value={failed.now} max={failed.now + success.now} tone={failureRate >= 20 ? "danger" : "warning"} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">نجح</dt>
                <dd className="mt-0.5 font-mono tabular-nums">{count(success.now)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">فشل</dt>
                <dd className="mt-0.5 font-mono tabular-nums">{count(failed.now)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">نقرات العرض الإضافي</dt>
                <dd className="mt-0.5 font-mono tabular-nums">{count(offers.now)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">لكل دفعة ناجحة</dt>
                <dd className="mt-0.5 font-mono tabular-nums">{success.now ? (offers.now / success.now).toFixed(2) : "—"}</dd>
              </div>
            </dl>
          </AdminPanel>
        </div>
      </div>

      <AdminPanel title="الوجهات حسب التحويل" hint="أكثر الدول مشاهدةً في الفترة، ومن تحوّل منها إلى طلب ثم إلى دفع." flush>
        {destinations.length === 0 ? (
          <div className="p-5">
            <AdminEmpty>لا مشاهدات مرتبطة بوجهة في هذه الفترة.</AdminEmpty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className={adminThClass}>الوجهة</th>
                  <th className={cn(adminThClass, "w-24")}>مشاهدات</th>
                  <th className={cn(adminThClass, "w-24")}>بدأ طلباً</th>
                  <th className={cn(adminThClass, "w-24")}>دفع</th>
                  <th className={cn(adminThClass, "w-48")}>من المشاهدة إلى الدفع</th>
                </tr>
              </thead>
              <tbody>
                {destinations.map((row) => {
                  const rate = pct(row.paid, row.views);
                  return (
                    <tr key={row.slug} className={adminTrClass}>
                      <td className={adminTdClass}>
                        <span className="block truncate">{row.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{row.slug}</span>
                      </td>
                      <td className={cn(adminTdClass, "font-mono tabular-nums")}>{count(row.views)}</td>
                      <td className={cn(adminTdClass, "font-mono tabular-nums")}>
                        {count(row.begins)}
                        <span className="ms-1.5 text-[11px] text-muted-foreground">{pct(row.begins, row.views)}%</span>
                      </td>
                      <td className={cn(adminTdClass, "font-mono tabular-nums")}>{count(row.paid)}</td>
                      <td className={adminTdClass}>
                        <div className="flex items-center gap-3">
                          <span className="min-w-0 flex-1">
                            <Bar value={rate} max={100} tone={rate >= 10 ? "success" : rate > 0 ? "warning" : "neutral"} />
                          </span>
                          <span className="w-10 text-end font-mono text-xs tabular-nums">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="كل الأحداث" hint={`${count(total)} حدث خلال ${days} يوماً · الحصة من مجموع أحداث الفترة`} flush>
        {events.length === 0 ? (
          <div className="p-5">
            <AdminEmpty>لا أحداث بعد.</AdminEmpty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className={adminThClass}>الحدث</th>
                  <th className={cn(adminThClass, "w-24")}>العدد</th>
                  <th className={cn(adminThClass, "w-56")}>الحصة</th>
                  {compare ? <th className={cn(adminThClass, "w-32")}>الفترة السابقة</th> : null}
                </tr>
              </thead>
              <tbody>
                {events.map((row) => {
                  const delta = change(row.now, row.previous);
                  const improving = delta !== null && (row.name === "payment_failed" ? delta < 0 : delta > 0);
                  return (
                    <tr key={row.name} className={adminTrClass}>
                      <td className={adminTdClass}>
                        <span className="block">{eventLabels[row.name] ?? row.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{row.name}</span>
                      </td>
                      <td className={cn(adminTdClass, "font-mono font-medium tabular-nums")}>{count(row.now)}</td>
                      <td className={adminTdClass}>
                        <div className="flex items-center gap-3">
                          <span className="min-w-0 flex-1">
                            <Bar value={row.now} max={maxEvent} tone={row.name === "payment_failed" ? "danger" : row.name === "payment_success" ? "success" : "info"} />
                          </span>
                          <span className="w-10 text-end font-mono text-xs tabular-nums text-muted-foreground">{pct(row.now, total)}%</span>
                        </div>
                      </td>
                      {compare ? (
                        <td className={cn(adminTdClass, "font-mono text-xs tabular-nums")}>
                          <span className="text-muted-foreground">{count(row.previous)}</span>
                          {delta !== null ? (
                            <span className={cn("ms-2", delta === 0 ? "text-muted-foreground" : improving ? "text-emerald-400" : "text-rose-400")}>
                              {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)}%
                            </span>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
