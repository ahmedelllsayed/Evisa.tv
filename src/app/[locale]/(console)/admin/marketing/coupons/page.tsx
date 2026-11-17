import { AdminPage } from "@/components/admin/chrome";
import { CouponEditor } from "@/components/admin/marketing/coupon-editor";
import { listDestinations } from "@/lib/data/catalog";
import { listCoupons } from "@/lib/data/coupons";
import { marketingAccess } from "@/lib/data/marketing/access";
import { listSegments } from "@/lib/data/marketing/library";
import type { Page } from "@/lib/page";

export const metadata = { title: "الكوبونات" };

export default async function MarketingCouponsPage({ params }: Page) {
  const { locale } = await params;
  const access = await marketingAccess(locale);
  const [coupons, destinations, segments] = await Promise.all([listCoupons(), listDestinations({ includeInactive: true }), listSegments()]);
  return (
    <AdminPage
      title="الكوبونات"
      description="رموز خصم بشروط: الوجهة ونوع التأشيرة وحد أدنى وسقف ومرات لكل عميل وأول طلب وشريحة. افتح الكوبون لتوليد رموز فردية وسجل الاستخدام."
    >
      <CouponEditor
        locale={locale}
        coupons={coupons}
        canEdit={access.canEdit}
        destinations={destinations.map((destination) => ({ id: destination.id, name: destination.nameAr || destination.name }))}
        segments={segments.map((segment) => ({ id: segment.id, name: segment.name }))}
      />
    </AdminPage>
  );
}
