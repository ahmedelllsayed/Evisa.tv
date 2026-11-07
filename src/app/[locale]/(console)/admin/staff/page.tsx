import { redirect } from "next/navigation";
import { AdminPage, StatTile } from "@/components/admin/chrome";
import { count } from "@/components/admin/format";
import { requireAdmin } from "@/lib/auth";
import { listPromotableEmails, listStaffLoad, openFileTotals } from "@/lib/data/admin-people";
import { getAllStaffPerformance, listStaff } from "@/lib/data/staff";
import { href } from "@/lib/href";
import { currentUserHasPermission, getAssignableRoles } from "@/lib/rbac";
import { AddStaffDialog } from "./_components/add-staff-dialog";
import { StaffPerformance } from "./_components/staff-performance";
import { capacity, isActive, type StaffMember } from "./_components/staff-shared";
import { StaffTable } from "./_components/staff-table";

export const metadata = {
  title: "إدارة الموظفين",
};

export default async function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const admin = await requireAdmin(locale);
  if (!(await currentUserHasPermission("staff", "view"))) redirect(`/${locale}/admin`);

  const [staff, performance, load, totals, canManage, canChangeRole, assignable] = await Promise.all([
    listStaff(),
    getAllStaffPerformance(30),
    listStaffLoad(),
    openFileTotals(),
    currentUserHasPermission("staff", "manage"),
    currentUserHasPermission("users", "change_role"),
    getAssignableRoles(),
  ]);
  const canAdd = canManage && canChangeRole;
  const candidates = canAdd ? await listPromotableEmails() : [];
  const perfById = new Map(performance.map((row) => [row.userId, row]));

  const members: StaffMember[] = staff.map((member) => {
    const perf = perfById.get(member.id);
    const stats = load[member.id];
    return {
      id: member.id,
      email: member.email,
      fullName: member.fullName,
      role: member.role,
      phone: member.phone,
      banned: member.banned,
      profile: member.staff
        ? {
            department: member.staff.department,
            specialty: member.staff.specialty,
            maxApplications: member.staff.maxApplications,
            notes: member.staff.notes,
            active: member.staff.active,
            hiredAt: stats?.hiredAt ?? null,
          }
        : null,
      open: stats?.open ?? 0,
      late: stats?.late ?? 0,
      perf: perf ? { processed: perf.processed, approved: perf.approved, rejected: perf.rejected, avgHours: perf.avgProcessingHours } : null,
    };
  });

  const active = members.filter(isActive);
  const overloaded = active.filter((member) => member.open >= capacity(member));
  const assigned = totals.open - totals.unassigned;
  const processed = performance.reduce((sum, row) => sum + row.processed, 0);
  const approved = performance.reduce((sum, row) => sum + row.approved, 0);
  const departments = [...new Set(members.map((member) => member.profile?.department).filter((value): value is string => Boolean(value)))];
  const names = Object.fromEntries(members.map((member) => [member.id, member.fullName || member.email]));

  return (
    <AdminPage
      title="إدارة الموظفين"
      description="فريق العمل وأدواره وأعباؤه. راقب من اقترب من حده الأقصى، وعطّل من لا يجب أن يُسند إليه ملف."
      action={canAdd ? <AddStaffDialog locale={locale} assignable={assignable} candidates={candidates} departments={departments} /> : null}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="موظفون نشطون"
          value={
            <>
              {count(active.length)}
              <span className="text-base text-muted-foreground">/{members.length}</span>
            </>
          }
          note={members.length - active.length ? `${members.length - active.length} معطّل أو محظور` : "كل الفريق متاح"}
          tone="success"
        />
        <StatTile
          label="ملفات مفتوحة"
          value={count(totals.open)}
          note={`${assigned} مُسند · ${totals.unassigned} غير مُسند${totals.late ? ` · ${totals.late} متأخر` : ""}`}
          tone={totals.late ? "danger" : totals.unassigned ? "warning" : "info"}
          href={href(totals.unassigned ? "/admin/queue" : "/admin/applications", locale)}
        />
        <StatTile
          label="فوق الطاقة"
          value={count(overloaded.length)}
          note={overloaded.length ? overloaded.map((member) => member.fullName || member.email).join("، ") : "الكل ضمن الحد الأقصى"}
          tone={overloaded.length ? "danger" : "neutral"}
        />
        <StatTile
          label="معالَج خلال 30 يوماً"
          value={count(processed)}
          note={processed ? `نسبة القبول ${Math.round((approved / processed) * 100)}%` : "لا ملفات مُغلقة بعد"}
          tone="info"
        />
      </div>

      <StaffTable
        locale={locale}
        members={members}
        departments={departments}
        access={{ currentUserId: admin.id, currentRole: admin.role, canManage, canChangeRole, canAdd, assignable }}
      />

      <StaffPerformance performance={performance} names={names} />
    </AdminPage>
  );
}
