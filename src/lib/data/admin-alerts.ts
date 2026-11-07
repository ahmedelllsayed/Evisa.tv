import "server-only";
import { sql } from "@/lib/data/db";

export type AdminAlert = {
  id: string;
  title: string;
  body: string;
  href: string;
  at: string;
};

export async function listAdminAlerts(): Promise<AdminAlert[]> {
  const [applications, payments, messages, late] = await Promise.all([
    sql<{ id: string; reference: string; status: string; created_at: string }>(
      `select id, reference, status, created_at from applications
       where status <> 'draft' and created_at > now() - interval '2 days'
       order by created_at desc limit 6`,
    ),
    sql<{ id: string; reference: string; amount: string; currency: string; created_at: string }>(
      `select p.id, a.reference, p.amount, p.currency, p.created_at
       from payments p join applications a on a.id = p.application_id
       where p.status = 'paid' and p.created_at > now() - interval '2 days'
       order by p.created_at desc limit 6`,
    ),
    sql<{ id: string; name: string; created_at: string }>(
      `select id, name, created_at from contact_messages
       where read_at is null order by created_at desc limit 6`,
    ),
    sql<{ id: string; reference: string; guaranteed_at: string }>(
      `select id, reference, guaranteed_at from applications
       where guaranteed_at is not null and guaranteed_at < now()
         and status not in ('draft', 'payment_pending', 'approved', 'rejected', 'cancelled', 'refunded')
       order by guaranteed_at asc limit 6`,
    ),
  ]);
  const items: AdminAlert[] = [
    ...applications.map((row) => ({
      id: `app-${row.id}`,
      title: `طلب ${row.reference}`,
      body: row.status,
      href: `/admin/applications/${row.id}`,
      at: String(row.created_at),
    })),
    ...payments.map((row) => ({
      id: `pay-${row.id}`,
      title: `دفعة ${row.reference}`,
      body: `${row.amount} ${row.currency}`,
      href: `/admin/payments`,
      at: String(row.created_at),
    })),
    ...messages.map((row) => ({
      id: `msg-${row.id}`,
      title: `رسالة من ${row.name}`,
      body: "غير مقروءة",
      href: `/admin/messages`,
      at: String(row.created_at),
    })),
    ...late.map((row) => ({
      id: `late-${row.id}`,
      title: `متأخر ${row.reference}`,
      body: "تجاوز موعد الضمان",
      href: `/admin/applications/${row.id}`,
      at: String(row.guaranteed_at),
    })),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
}
