import { AdminShell } from "@/components/admin/admin-nav";
import { adminCairo, adminCairoLatin, adminLato } from "@/config/fonts";
import { requireAdmin } from "@/lib/auth";
import { opsCounts } from "@/lib/data/applications";
import { currentUserHasPermission } from "@/lib/rbac";
import type { Layout } from "@/lib/page";

export default async function AdminLayout({ children, params }: Layout) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [ops, showStaff, showUsers] = await Promise.all([
    opsCounts(),
    currentUserHasPermission("staff", "view"),
    currentUserHasPermission("users", "view"),
  ]);
  return (
    <div dir="ltr" className={`${adminCairo.variable} ${adminCairoLatin.variable} ${adminLato.variable} admin-shell surface-ar min-h-svh`}>
      <AdminShell locale={locale} attention={ops.attention} email={user.email} showStaff={showStaff} showUsers={showUsers}>
        {children}
      </AdminShell>
    </div>
  );
}
