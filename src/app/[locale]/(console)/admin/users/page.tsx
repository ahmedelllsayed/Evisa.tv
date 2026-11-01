import { redirect } from "next/navigation";
import { UserTable } from "@/components/admin/user-table";
import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/data/users";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";

export const metadata = { title: "المستخدمون" };

export default async function AdminUsersPage({ params }: Page) {
  const { locale } = await params;
  const admin = await requireAdmin(locale);
  if (!(await currentUserHasPermission("users", "view"))) redirect(`/${locale}/admin`);
  const users = await listUsers();
  return <UserTable locale={locale} users={users} currentUserId={admin.id} />;
}
