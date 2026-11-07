import { redirect } from "next/navigation";
import { UserTable } from "@/components/admin/user-table";
import type { PeopleUser } from "@/components/admin/people/user-editor";
import { requireAdmin } from "@/lib/auth";
import { listUserFlags } from "@/lib/data/admin-people";
import { listUsers } from "@/lib/data/users";
import type { Page } from "@/lib/page";
import { currentUserHasPermission, getAssignableRoles } from "@/lib/rbac";

export const metadata = { title: "المستخدمون" };

export default async function AdminUsersPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const admin = await requireAdmin(locale);
  if (!(await currentUserHasPermission("users", "view"))) redirect(`/${locale}/admin`);
  const [users, flags, assignable, create, edit, ban, remove, changeRole] = await Promise.all([
    listUsers(),
    listUserFlags(),
    getAssignableRoles(),
    currentUserHasPermission("users", "create"),
    currentUserHasPermission("users", "edit"),
    currentUserHasPermission("users", "ban"),
    currentUserHasPermission("users", "delete"),
    currentUserHasPermission("users", "change_role"),
  ]);
  const rows: PeopleUser[] = users.map((user) => ({
    ...user,
    anonymized: flags[user.id]?.anonymized ?? false,
    paidPayments: flags[user.id]?.paidPayments ?? 0,
  }));
  return (
    <UserTable
      locale={locale}
      users={rows}
      initialQuery={typeof sp.q === "string" ? sp.q.slice(0, 120) : ""}
      now={new Date().toISOString()}
      access={{ currentUserId: admin.id, currentRole: admin.role, assignable, can: { create, edit, ban, delete: remove, changeRole } }}
    />
  );
}
