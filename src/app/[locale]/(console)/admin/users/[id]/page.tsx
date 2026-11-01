import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminSaveUserNotes } from "@/app/actions/admin";
import { AdminCard, AdminPage, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/data/db";
import { listApplicationsForUser } from "@/lib/data/applications";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";
import { ROLE_LABELS, parseAdminRole } from "@/lib/rbac-constants";

export const metadata = { title: "ملف مستخدم" };

export default async function AdminUserPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  await requireAdmin(locale);
  if (!(await currentUserHasPermission("users", "view"))) redirect(`/${locale}/admin`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = (await sql<{ id: string; email: string; full_name: string | null; phone: string | null; role: string; staff_notes: string | null; created_at: string }>(
    "select id, email, full_name, phone, role, staff_notes, created_at from profiles where id = $1",
    [id],
  ))[0];
  if (!profile) notFound();
  const [applications, payments, audit] = await Promise.all([
    listApplicationsForUser(id),
    sql<{ id: string; amount: string; currency: string; status: string; provider: string; reference: string; created_at: string }>(
      `select p.id, p.amount, p.currency, p.status, p.provider, a.reference, p.created_at
       from payments p join applications a on a.id = p.application_id
       where a.user_id = $1 order by p.created_at desc limit 30`,
      [id],
    ),
    sql<{ action: string; detail: string | null; created_at: string }>(
      "select action, detail, created_at from admin_audit where target = $1 order by created_at desc limit 20",
      [id],
    ),
  ]);
  const role = parseAdminRole(profile.role);
  return (
    <AdminPage title={profile.full_name || profile.email} description={`${profile.email} · ${ROLE_LABELS[role]}`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h2 className="text-sm font-medium">الطلبات</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {applications.length === 0 && <li className="text-muted-foreground">لا توجد طلبات.</li>}
            {applications.map((app) => (
              <li key={app.id}>
                <Link href={href(`/admin/applications/${app.id}`, locale)} className="hover:underline">{app.reference}</Link>
                <span className="text-muted-foreground"> · {app.status} · {app.destinationName}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
        <AdminCard>
          <h2 className="text-sm font-medium">المدفوعات</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {payments.length === 0 && <li className="text-muted-foreground">لا توجد مدفوعات.</li>}
            {payments.map((payment) => (
              <li key={payment.id} className="flex justify-between gap-3">
                <span>{payment.reference} · {payment.provider}</span>
                <span className="text-muted-foreground">{payment.status} · {payment.amount} {payment.currency}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
      <AdminCard>
        <h2 className="text-sm font-medium">ملاحظات داخلية</h2>
        <form action={adminSaveUserNotes.bind(null, locale, id)} className="mt-3">
          <textarea name="notes" defaultValue={profile.staff_notes ?? ""} className={adminTextareaClass} rows={4} />
          <button className={`${adminPrimaryClass} mt-3`}>حفظ الملاحظة</button>
        </form>
      </AdminCard>
      <AdminCard>
        <h2 className="text-sm font-medium">سجل النشاط على هذا الحساب</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.length === 0 && <li className="text-muted-foreground">لا يوجد نشاط مسجّل.</li>}
          {audit.map((row, index) => (
            <li key={`${row.created_at}-${index}`} className="flex justify-between gap-3">
              <span>{row.action}{row.detail ? ` · ${row.detail}` : ""}</span>
              <span className="text-muted-foreground">{String(row.created_at).slice(0, 16)}</span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </AdminPage>
  );
}
