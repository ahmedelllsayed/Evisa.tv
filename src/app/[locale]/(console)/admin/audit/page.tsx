import { AdminCard, AdminEmpty, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { iso, sql } from "@/lib/data/db";
import type { Page } from "@/lib/page";

export const metadata = { title: "سجل النشاط" };

export default async function AdminAuditPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const rows = await sql("select actor_email, action, target, detail, created_at from admin_audit order by created_at desc limit 100");
  return (
    <AdminPage title="سجل النشاط" description="من غيّر الإعدادات أو حالة المستخدمين والرسائل.">
      {rows.length === 0 ? (
        <AdminEmpty>لا توجد عمليات مسجّلة بعد.</AdminEmpty>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={`${row.created_at}-${index}`}>
              <AdminCard>
                <p className="text-sm font-medium">{String(row.action)}</p>
                <p className="mt-1 text-xs text-muted-ink">
                  {String(row.actor_email ?? "—")} · {String(row.target ?? "")} · {iso(row.created_at)}
                </p>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
