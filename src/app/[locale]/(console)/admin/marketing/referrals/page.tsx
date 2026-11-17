import Link from "next/link";
import { AdminEmpty, AdminPage, AdminPanel, Pill, StatTile, adminGhostClass } from "@/components/admin/chrome";
import { ReferralForm } from "@/components/admin/marketing/referral-form";
import { listCoupons } from "@/lib/data/coupons";
import { marketingAccess } from "@/lib/data/marketing/access";
import { referralOverview } from "@/lib/data/marketing/referrals";
import { getMarketingSettings } from "@/lib/data/marketing/settings";
import { href } from "@/lib/href";
import { marketingDate } from "@/lib/marketing/labels";
import type { Page } from "@/lib/page";

export const metadata = { title: "الإحالة" };

export default async function MarketingReferralsPage({ params }: Page) {
  const { locale } = await params;
  const access = await marketingAccess(locale);
  const [settings, overview, coupons] = await Promise.all([getMarketingSettings(), referralOverview(), listCoupons({ includeSystem: true })]);
  const system = coupons.filter((coupon) => coupon.system);
  return (
    <AdminPage title="الإحالة" description="كل عميل له رابط في حسابه. الصديق يأخذ خصماً على أول طلب، والداعي يأخذ رمزاً بعد أن يدفع صديقه.">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="سجّلوا بإحالة" value={overview.referred} />
        <StatTile label="دفعوا" value={overview.paid} />
        <StatTile label="مكافآت صدرت" value={overview.rewards.length} />
        <StatTile label="مكافآت استُخدمت" value={overview.rewards.filter((reward) => reward.used).length} />
      </div>
      <AdminPanel title="الإعداد" action={system.map((coupon) => (
        <Link key={coupon.id} href={href(`/admin/marketing/coupons/${coupon.id}`, locale)} className={adminGhostClass}>
          {coupon.system === "referral_friend" ? "سجل خصم الصديق" : "سجل مكافآت الداعين"}
        </Link>
      ))}>
        <ReferralForm locale={locale} initial={settings.referral} canEdit={access.canEdit} />
      </AdminPanel>
      <AdminPanel title="الداعون" flush>
        {overview.referrers.length === 0 ? (
          <div className="p-5"><AdminEmpty title="لا أحد سجّل برابط إحالة بعد" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">الداعي</th>
                <th className="px-4 py-2 text-start font-medium">أصدقاء</th>
                <th className="px-4 py-2 text-start font-medium">دفعوا</th>
                <th className="px-4 py-2 text-start font-medium">مكافآت</th>
              </tr>
            </thead>
            <tbody>
              {overview.referrers.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2"><Link href={href(`/admin/users/${row.id}`, locale)} className="hover:text-primary" dir="ltr">{row.email}</Link></td>
                  <td className="px-4 py-2">{row.friends}</td>
                  <td className="px-4 py-2">{row.paidFriends}</td>
                  <td className="px-4 py-2 text-xs">صدر {row.rewards} · استُخدم {row.used}{row.cancelled ? ` · أُلغي ${row.cancelled}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminPanel>
      {overview.rewards.length ? (
        <AdminPanel title="آخر المكافآت" flush>
          <table className="w-full text-sm">
            <thead className="bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">الداعي</th>
                <th className="px-4 py-2 text-start font-medium">الصديق والطلب</th>
                <th className="px-4 py-2 text-start font-medium">الرمز</th>
                <th className="px-4 py-2 text-start font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {overview.rewards.map((reward) => (
                <tr key={`${reward.reference}-${reward.code}`} className="border-t">
                  <td className="px-4 py-2 text-xs" dir="ltr">{reward.referrer}</td>
                  <td className="px-4 py-2 text-xs"><span dir="ltr">{reward.friend}</span> · <span className="font-mono">{reward.reference}</span></td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs" dir="ltr">{reward.code ?? "—"}</span>{" "}
                    <Pill tone={reward.status === "cancelled" ? "danger" : reward.used ? "success" : "info"}>{reward.status === "cancelled" ? "ملغى" : reward.used ? "استُخدم" : "متاح"}</Pill>
                  </td>
                  <td className="px-4 py-2 text-xs">{marketingDate(reward.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      ) : null}
    </AdminPage>
  );
}
