import { redirect } from "next/navigation";
import { CouponEditor } from "@/components/admin/coupon-editor";
import { AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import { listCoupons } from "@/lib/data/coupons";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";
import { isFullAdmin } from "@/lib/rbac-constants";

export const metadata = { title: "الكوبونات" };

export default async function AdminCouponsPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [canView, canEdit, coupons, destinations] = await Promise.all([
    currentUserHasPermission("settings", "view"),
    currentUserHasPermission("settings", "edit"),
    listCoupons(),
    listDestinations({ includeInactive: true }),
  ]);
  if (!canView && !isFullAdmin(user.role)) redirect(`/${locale}/admin`);
  return (
    <AdminPage title="الكوبونات" description="رموز خصم يخصمها العميل قبل الدفع. اختر رسم الخدمة أو الإجمالي كله، وحدد الدولة إن كان الرمز ليس لكل الوجهات.">
      <CouponEditor
        locale={locale}
        coupons={coupons}
        canEdit={canEdit || isFullAdmin(user.role)}
        destinations={destinations.map((destination) => ({ id: destination.id, name: destination.nameAr || destination.name }))}
      />
    </AdminPage>
  );
}
