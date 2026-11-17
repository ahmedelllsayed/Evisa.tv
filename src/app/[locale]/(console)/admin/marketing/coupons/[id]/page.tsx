import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEmpty, AdminPage, AdminPanel, KeyValue, Pill, StatTile, adminGhostClass } from "@/components/admin/chrome";
import { CouponCodeBatch } from "@/components/admin/marketing/coupon-codes";
import { CopyButton } from "@/components/admin/marketing/copy-button";
import { listDestinations } from "@/lib/data/catalog";
import { getCoupon, listCouponCodes, listCouponUses } from "@/lib/data/coupons";
import { marketingAccess } from "@/lib/data/marketing/access";
import { href } from "@/lib/href";
import { marketingDate, money } from "@/lib/marketing/labels";
import { couponLink } from "@/lib/marketing/links";
import type { Page } from "@/lib/page";

export const metadata = { title: "الكوبون" };

const useStatus = { used: "مدفوع", held: "محجوز للدفع", released: "أُلغي الحجز" } as const;

export default async function CouponDetailPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const access = await marketingAccess(locale);
  const coupon = await getCoupon(id);
  if (!coupon) notFound();
  const [codes, uses, destinations] = await Promise.all([listCouponCodes(id), listCouponUses(id), listDestinations({ includeInactive: true })]);
  const names = new Map(destinations.map((destination) => [destination.id, destination.nameAr || destination.name]));
  const exportBase = `/api/admin/marketing/export?id=${coupon.id}`;
  return (
    <AdminPage
      eyebrow="الكوبونات"
      title={coupon.code}
      description={coupon.name ?? (coupon.system ? "كوبون برنامج الإحالة. يُضبط من صفحة الإحالة." : undefined)}
      action={
        <Link href={href(coupon.system ? "/admin/marketing/referrals" : "/admin/marketing/coupons", locale)} className={adminGhostClass}>
          رجوع
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="استُخدم" value={coupon.usedCount} note={coupon.maxUses ? `من ${coupon.maxUses}` : "بلا حد"} />
        <StatTile label="محجوز الآن" value={coupon.heldCount} />
        <StatTile label="إجمالي الخصم" value={money(coupon.discountTotal)} />
        <StatTile label="رموز فردية" value={`${coupon.codeUsed} / ${coupon.codeCount}`} />
      </div>
      <AdminPanel title="الشروط">
        <KeyValue
          items={[
            { label: "الخصم", value: `${coupon.kind === "percent" ? `${coupon.value}%` : money(coupon.value)} من ${coupon.appliesTo === "service" ? "رسم الخدمة" : "الإجمالي"}${coupon.maxDiscount ? `، حتى ${money(coupon.maxDiscount)}` : ""}` },
            { label: "الحالة", value: <Pill tone={coupon.active ? "success" : "neutral"} dot>{coupon.active ? "مفعّل" : "متوقف"}</Pill> },
            { label: "الوجهات", value: coupon.destinationIds.length ? coupon.destinationIds.map((item) => names.get(item) ?? item).join("، ") : "كل الدول" },
            { label: "أنواع التأشيرة", value: coupon.visaTypes.length ? coupon.visaTypes.join("، ") : "كل الأنواع" },
            { label: "حد أدنى للطلب", value: coupon.minTotal ? money(coupon.minTotal) : "—" },
            { label: "لكل عميل", value: `${coupon.perCustomer} مرة${coupon.firstOrderOnly ? "، أول طلب فقط" : ""}` },
            { label: "الشريحة", value: coupon.segmentName ?? "كل العملاء" },
            { label: "المدة", value: `${coupon.startsAt ?? "—"} إلى ${coupon.endsAt ?? "—"}` },
          ]}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">رابط يطبّق الكوبون عند الدفع:</span>
          <code dir="ltr" className="rounded bg-muted px-2 py-1 text-xs">{couponLink(coupon.code)}</code>
          <CopyButton value={couponLink(coupon.code)} />
        </div>
      </AdminPanel>

      {coupon.system ? null : (
        <AdminPanel
          title="رموز فردية"
          hint="كل رمز يُدفع به مرة واحدة ويأخذ شروط هذا الكوبون. تُرسل الحملات رمزاً لكل مستلم تلقائياً."
          action={codes.length ? <a href={`${exportBase}&kind=coupon-codes`} className={adminGhostClass}>تصدير</a> : null}
        >
          <CouponCodeBatch locale={locale} couponId={coupon.id} canEdit={access.canEdit} />
          {codes.length ? (
            <div className="mt-4 max-h-80 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-card text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">الرمز</th>
                    <th className="px-3 py-2 text-start font-medium">مخصص لـ</th>
                    <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} className="border-t">
                      <td className="px-3 py-2 font-mono" dir="ltr">{code.code}</td>
                      <td className="px-3 py-2 text-xs" dir="ltr">{code.userEmail ?? code.email ?? "أي عميل"}</td>
                      <td className="px-3 py-2 text-xs">
                        {code.cancelled ? "ملغى" : code.usedAt ? `استُخدم ${marketingDate(code.usedAt)}` : code.expiresAt && code.expiresAt < new Date().toISOString() ? "انتهى" : "متاح"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </AdminPanel>
      )}

      <AdminPanel title="سجل الاستخدام" action={uses.length ? <a href={`${exportBase}&kind=coupon-uses`} className={adminGhostClass}>تصدير</a> : null}>
        {uses.length === 0 ? (
          <AdminEmpty title="لم يُستخدم بعد" />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-card text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">الطلب</th>
                  <th className="px-3 py-2 text-start font-medium">العميل</th>
                  <th className="px-3 py-2 text-start font-medium">الخصم</th>
                  <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {uses.map((use) => (
                  <tr key={use.applicationId} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={href(`/admin/applications/${use.applicationId}`, locale)} className="font-mono hover:text-primary" dir="ltr">{use.reference}</Link>
                      {use.code ? <p className="font-mono text-xs text-muted-foreground" dir="ltr">{use.code}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-xs" dir="ltr">{use.email ?? "—"}</td>
                    <td className="px-3 py-2">{money(use.amount)}<p className="text-xs text-muted-foreground">من {money(use.total + use.amount)}</p></td>
                    <td className="px-3 py-2 text-xs">{useStatus[use.status]}</td>
                    <td className="px-3 py-2 text-xs">{marketingDate(use.at)}</td>
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
