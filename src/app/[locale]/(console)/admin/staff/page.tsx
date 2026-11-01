import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listStaff, getAllStaffPerformance } from "@/lib/data/staff";
import { currentUserHasPermission } from "@/lib/rbac";
import { StaffTable } from "./_components/staff-table";
import { StaffPerformance } from "./_components/staff-performance";
import { AddStaffDialog } from "./_components/add-staff-dialog";

export const metadata = {
  title: "إدارة الموظفين",
};

export default async function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  if (!(await currentUserHasPermission("staff", "view"))) redirect(`/${locale}/admin`);

  const [staff, performance] = await Promise.all([listStaff(), getAllStaffPerformance(30)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الموظفين</h1>
          <p className="text-sm text-muted-foreground">إدارة فريق العمل والصلاحيات</p>
        </div>
        <AddStaffDialog locale={locale} />
      </div>

      <StaffPerformance performance={performance} />

      <StaffTable staff={staff} locale={locale} />
    </div>
  );
}
