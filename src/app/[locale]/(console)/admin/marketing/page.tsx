import Link from "next/link";
import { AdminEmpty, AdminPage, AdminPanel, PeriodSwitch, Pill, StatTile, adminGhostClass, adminPrimaryClass } from "@/components/admin/chrome";
import { marketingAccess } from "@/lib/data/marketing/access";
import { marketingOverview, type SourceResult } from "@/lib/data/marketing/reports";
import { href } from "@/lib/href";
import { campaignStatusLabels, channelLabels, marketingDate, money } from "@/lib/marketing/labels";
import type { Page } from "@/lib/page";

export const metadata = { title: "التسويق" };

function SourceTable({ rows, locale, kind }: { rows: SourceResult[]; locale: string; kind: "campaign" | "automation" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-card text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-start font-medium">{kind === "campaign" ? "الحملة" : "القاعدة"}</th>
            <th className="px-4 py-2 text-start font-medium">أُرسل</th>
            <th className="px-4 py-2 text-start font-medium">نقروا</th>
            <th className="px-4 py-2 text-start font-medium">ألغوا الاشتراك</th>
            <th className="px-4 py-2 text-start font-medium">استخدموا الكوبون</th>
            <th className="px-4 py-2 text-start font-medium">الخصم</th>
            <th className="px-4 py-2 text-start font-medium">إيراد بالكوبون</th>
            {kind === "campaign" ? <th className="px-4 py-2 text-start font-medium">إيراد بعد النقر</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-4 py-2">
                {kind === "campaign" ? (
                  <Link href={href(`/admin/marketing/campaigns/${row.id}`, locale)} className="font-medium hover:text-primary">{row.name}</Link>
                ) : (
                  <span className="font-medium">{row.name}</span>
                )}
                <p className="text-xs text-muted-foreground">
                  {channelLabels[row.channel]} · {kind === "campaign" ? campaignStatusLabels[row.status] ?? row.status : row.status === "active" ? "مفعّلة" : "متوقفة"} · {marketingDate(row.at)}
                </p>
              </td>
              <td className="px-4 py-2">{row.sent}{row.failed ? <span className="text-xs text-rose-300"> · فشل {row.failed}</span> : null}</td>
              <td className="px-4 py-2">{row.clickers}{row.sent ? <span className="text-xs text-muted-foreground"> ({Math.round((row.clickers / row.sent) * 100)}%)</span> : null}</td>
              <td className="px-4 py-2">{row.unsubscribed}</td>
              <td className="px-4 py-2">{row.couponUses}</td>
              <td className="px-4 py-2">{money(row.discount)}</td>
              <td className="px-4 py-2">{money(row.couponRevenue)}</td>
              {kind === "campaign" ? <td className="px-4 py-2">{money(row.clickRevenue)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MarketingOverviewPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const access = await marketingAccess(locale);
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const overview = await marketingOverview(days);
  const sent = overview.channels.reduce((sum, row) => sum + row.sent, 0);
  const clickers = overview.channels.reduce((sum, row) => sum + row.clickers, 0);
  const unsubscribed = overview.channels.reduce((sum, row) => sum + row.unsubscribed, 0);
  return (
    <AdminPage
      title="التسويق"
      description="نتائج الحملات والرسائل التلقائية والكوبونات في الفترة المختارة. كل رقم محسوب من الرسائل المسجّلة والطلبات المدفوعة."
      action={
        <>
          <PeriodSwitch base={href("/admin/marketing", locale)} days={days} />
          <a href={`/api/admin/marketing/export?kind=campaigns&days=${days}`} className={adminGhostClass}>تصدير</a>
          {access.canEdit ? <Link href={href("/admin/marketing/campaigns/new", locale)} className={adminPrimaryClass}>حملة جديدة</Link> : null}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="رسائل أُرسلت" value={sent} />
        <StatTile label="نقروا الروابط" value={clickers} note={sent ? `${Math.round((clickers / sent) * 100)}% من المرسل` : undefined} />
        <StatTile label="ألغوا الاشتراك" value={unsubscribed} />
        <StatTile label="استخدام الكوبونات" value={overview.coupons.uses} note={`خصم ${money(overview.coupons.discount)}`} />
        <StatTile label="إيراد طلبات بكوبون" value={money(overview.coupons.revenue)} note={overview.referral.rewards ? `مكافآت إحالة ${overview.referral.rewards}، استُخدم ${overview.referral.used}` : undefined} />
      </div>

      <AdminPanel title="القنوات" flush>
        <table className="w-full text-sm">
          <thead className="bg-card text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-start font-medium">القناة</th>
              <th className="px-4 py-2 text-start font-medium">أُرسل</th>
              <th className="px-4 py-2 text-start font-medium">فشل</th>
              <th className="px-4 py-2 text-start font-medium">تُرك</th>
              <th className="px-4 py-2 text-start font-medium">نقروا</th>
              <th className="px-4 py-2 text-start font-medium">ألغوا الاشتراك</th>
            </tr>
          </thead>
          <tbody>
            {overview.channels.map((row) => (
              <tr key={row.channel} className="border-t">
                <td className="px-4 py-2">{channelLabels[row.channel]}</td>
                <td className="px-4 py-2">{row.sent}</td>
                <td className="px-4 py-2">{row.failed ? <Pill tone="danger">{row.failed}</Pill> : 0}</td>
                <td className="px-4 py-2">{row.skipped}</td>
                <td className="px-4 py-2">{row.clickers}</td>
                <td className="px-4 py-2">{row.unsubscribed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminPanel>

      <AdminPanel title="الحملات" hint="إيراد الكوبون من طلبات مدفوعة استخدمت كوبون الحملة. إيراد ما بعد النقر من طلبات بدأت بعد النقر من غير ذلك الكوبون." flush>
        {overview.campaigns.length ? <SourceTable rows={overview.campaigns} locale={locale} kind="campaign" /> : <div className="p-5"><AdminEmpty title="لا حملات في هذه الفترة" /></div>}
      </AdminPanel>

      {overview.automations.length ? (
        <AdminPanel title="الرسائل التلقائية" flush>
          <SourceTable rows={overview.automations} locale={locale} kind="automation" />
        </AdminPanel>
      ) : null}

      <AdminPanel title="الكوبونات" flush>
        {overview.couponResults.length ? (
          <table className="w-full text-sm">
            <thead className="bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">الكوبون</th>
                <th className="px-4 py-2 text-start font-medium">استُخدم</th>
                <th className="px-4 py-2 text-start font-medium">الخصم</th>
                <th className="px-4 py-2 text-start font-medium">إيراد الطلبات</th>
              </tr>
            </thead>
            <tbody>
              {overview.couponResults.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={href(`/admin/marketing/coupons/${row.id}`, locale)} className="font-mono hover:text-primary" dir="ltr">{row.code}</Link>
                    {row.name ? <span className="ms-2 text-xs text-muted-foreground">{row.name}</span> : null}
                  </td>
                  <td className="px-4 py-2">{row.uses}</td>
                  <td className="px-4 py-2">{money(row.discount)}</td>
                  <td className="px-4 py-2">{money(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-5"><AdminEmpty title="لم يُستخدم كوبون في هذه الفترة" /></div>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
