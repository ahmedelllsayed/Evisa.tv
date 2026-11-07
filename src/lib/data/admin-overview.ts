import "server-only";
import { isoOrNull, num, one, sql } from "@/lib/data/db";

const closedSql = "('approved', 'rejected', 'cancelled', 'refunded')";

export type ActionItem = { count: number; oldest: string | null };

export type ActionCounts = {
  late: ActionItem;
  unassignedPaid: ActionItem;
  documents: ActionItem & { files: number };
  paymentReview: ActionItem;
  refunds: ActionItem;
  messages: ActionItem;
  now: Date;
};

export async function actionCounts(): Promise<ActionCounts> {
  const row = await one<Record<string, unknown>>(
    `select
       now() as now,
       (select count(*)::int from applications
         where guaranteed_at is not null and guaranteed_at < now()
           and status not in ('draft', 'payment_pending') and status not in ${closedSql}) as late,
       (select min(guaranteed_at) from applications
         where guaranteed_at is not null and guaranteed_at < now()
           and status not in ('draft', 'payment_pending') and status not in ${closedSql}) as late_oldest,
       (select count(*)::int from applications
         where assignee_id is null and paid_at is not null and status not in ${closedSql}) as unassigned_paid,
       (select min(paid_at) from applications
         where assignee_id is null and paid_at is not null and status not in ${closedSql}) as unassigned_paid_oldest,
       (select count(*)::int from documents d join applications a on a.id = d.application_id
         where d.status = 'uploaded' and d.kind <> 'issued_visa' and a.status not in ${closedSql}) as documents,
       (select count(distinct d.application_id)::int from documents d join applications a on a.id = d.application_id
         where d.status = 'uploaded' and d.kind <> 'issued_visa' and a.status not in ${closedSql}) as document_files,
       (select min(d.created_at) from documents d join applications a on a.id = d.application_id
         where d.status = 'uploaded' and d.kind <> 'issued_visa' and a.status not in ${closedSql}) as documents_oldest,
       (select count(distinct a.id)::int from applications a join application_events ev on ev.application_id = a.id
         where ev.internal = true and ev.title = 'Payment needs review' and a.status not in ${closedSql}) as payment_review,
       (select min(ev.created_at) from applications a join application_events ev on ev.application_id = a.id
         where ev.internal = true and ev.title = 'Payment needs review' and a.status not in ${closedSql}) as payment_review_oldest,
       (select count(*)::int from refund_requests where status = 'open') as refunds,
       (select min(created_at) from refund_requests where status = 'open') as refunds_oldest,
       (select count(*)::int from contact_messages where read_at is null and deleted_at is null) as messages,
       (select min(created_at) from contact_messages where read_at is null and deleted_at is null) as messages_oldest`,
  );
  const item = (key: string): ActionItem => ({ count: num(row?.[key]), oldest: isoOrNull(row?.[`${key}_oldest`]) });
  return {
    late: item("late"),
    unassignedPaid: item("unassigned_paid"),
    documents: { ...item("documents"), files: num(row?.document_files) },
    paymentReview: item("payment_review"),
    refunds: item("refunds"),
    messages: item("messages"),
    now: new Date(isoOrNull(row?.now) ?? 0),
  };
}

export type PeriodTotals = {
  applications: number;
  approved: number;
  rejected: number;
  avgHours: number;
  paidCount: number;
  paidTotal: number;
  refunded: number;
  failed: number;
  payments: number;
};

/** Totals for the window that ends `offset` periods ago (0 = current period, 1 = the one before). */
async function periodTotals(days: number, offset: number): Promise<PeriodTotals> {
  const row = await one<Record<string, unknown>>(
    `with bounds as (
       select now() - (($1::int * ($2::int + 1)) * interval '1 day') as start_at,
              now() - (($1::int * $2::int) * interval '1 day') as end_at
     )
     select
       (select count(*)::int from applications, bounds where created_at >= start_at and created_at < end_at) as applications,
       (select count(*)::int from applications, bounds where status = 'approved' and updated_at >= start_at and updated_at < end_at) as approved,
       (select count(*)::int from applications, bounds where status = 'rejected' and updated_at >= start_at and updated_at < end_at) as rejected,
       coalesce((select avg(extract(epoch from (updated_at - created_at)) / 3600) from applications, bounds
         where status in ('approved', 'rejected') and updated_at >= start_at and updated_at < end_at), 0) as avg_hours,
       (select count(*)::int from payments, bounds where status = 'paid' and created_at >= start_at and created_at < end_at) as paid_count,
       coalesce((select sum(amount) from payments, bounds where status = 'paid' and created_at >= start_at and created_at < end_at), 0) as paid_total,
       (select count(*)::int from payments, bounds where status = 'refunded' and created_at >= start_at and created_at < end_at) as refunded,
       (select count(*)::int from payments, bounds where status = 'failed' and created_at >= start_at and created_at < end_at) as failed,
       (select count(*)::int from payments, bounds where created_at >= start_at and created_at < end_at) as payments`,
    [days, offset],
  );
  return {
    applications: num(row?.applications),
    approved: num(row?.approved),
    rejected: num(row?.rejected),
    avgHours: num(row?.avg_hours),
    paidCount: num(row?.paid_count),
    paidTotal: num(row?.paid_total),
    refunded: num(row?.refunded),
    failed: num(row?.failed),
    payments: num(row?.payments),
  };
}

export async function periodComparison(days: number) {
  const [current, previous] = await Promise.all([periodTotals(days, 0), periodTotals(days, 1)]);
  return { current, previous };
}

export async function staleSummary(limit = 6) {
  const [total, rows] = await Promise.all([
    one<{ n: number }>(
      `select count(*)::int as n from destinations
       where is_active and visa_required and (reviewed_at is null or reviewed_at < now() - interval '180 days')`,
    ),
    sql<{ name: string; slug: string; reviewed_at: unknown }>(
      `select name, slug, reviewed_at from destinations
       where is_active and visa_required and (reviewed_at is null or reviewed_at < now() - interval '180 days')
       order by reviewed_at asc nulls first, name limit $1`,
      [limit],
    ),
  ]);
  return {
    total: total?.n ?? 0,
    never: rows.filter((row) => row.reviewed_at == null).length,
    items: rows.map((row) => ({ name: row.name, slug: row.slug, reviewedAt: isoOrNull(row.reviewed_at) })),
  };
}

export async function funnelCounts(days: number) {
  const rows = await sql<{ name: string; now: number; previous: number }>(
    `select name,
            count(*) filter (where created_at >= now() - ($1::int * interval '1 day'))::int as now,
            count(*) filter (where created_at < now() - ($1::int * interval '1 day'))::int as previous
     from funnel_events
     where created_at >= now() - (($1::int * 2) * interval '1 day')
     group by name`,
    [days],
  );
  return rows.map((row) => ({ name: row.name, now: num(row.now), previous: num(row.previous) }));
}

export async function funnelByDestination(days: number, limit = 8) {
  const rows = await sql<{ slug: string; name: string | null; views: number; begins: number; paid: number }>(
    `select f.destination_slug as slug, d.name,
            count(*) filter (where f.name = 'view_visa')::int as views,
            count(*) filter (where f.name = 'begin_application')::int as begins,
            count(*) filter (where f.name = 'payment_success')::int as paid
     from funnel_events f
     left join destinations d on d.slug = f.destination_slug
     where f.destination_slug is not null and f.destination_slug <> ''
       and f.created_at >= now() - ($1::int * interval '1 day')
     group by f.destination_slug, d.name
     order by views desc, begins desc
     limit $2`,
    [days, limit],
  );
  return rows.map((row) => ({ slug: row.slug, name: row.name ?? row.slug, views: num(row.views), begins: num(row.begins), paid: num(row.paid) }));
}

/** When tracking started, and whether the current and previous windows are fully covered by it. */
export async function funnelCoverage(days: number) {
  const row = await one<{ first: unknown; partial: boolean | null; previous_partial: boolean | null }>(
    `select min(created_at) as first,
            min(created_at) > now() - ($1::int * interval '1 day') as partial,
            min(created_at) > now() - (($1::int * 2) * interval '1 day') as previous_partial
     from funnel_events`,
    [days],
  );
  return { first: isoOrNull(row?.first), partial: Boolean(row?.partial), previousPartial: Boolean(row?.previous_partial) };
}

export type PaymentSlice = { provider: string; method: string | null; status: string; n: number; total: number };

export async function paymentBreakdown(days: number): Promise<PaymentSlice[]> {
  const rows = await sql<{ provider: string; method: string | null; status: string; n: number; total: string }>(
    `select provider, nullif(method, '') as method, status, count(*)::int as n, coalesce(sum(amount), 0) as total
     from payments
     where created_at >= now() - ($1::int * interval '1 day')
     group by provider, nullif(method, ''), status`,
    [days],
  );
  return rows.map((row) => ({ provider: row.provider, method: row.method, status: row.status, n: num(row.n), total: num(row.total) }));
}

export const paymentStatuses = ["paid", "pending", "failed", "refunded"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export type RecentPayment = {
  id: string;
  applicationId: string;
  reference: string;
  email: string | null;
  provider: string;
  method: string | null;
  status: string;
  amount: number;
  refundedAmount: number;
  currency: string;
  createdAt: string;
  processedAt: string | null;
};

export async function recentPayments(days: number, status: PaymentStatus | null, limit = 50): Promise<RecentPayment[]> {
  const rows = await sql<Record<string, unknown>>(
    `select p.id, p.application_id, a.reference, coalesce(nullif(p.billing_email, ''), u.email) as email,
            p.provider, nullif(p.method, '') as method, p.status, p.amount, p.refunded_amount, p.currency,
            p.created_at, p.processed_at
     from payments p
     join applications a on a.id = p.application_id
     left join profiles u on u.id = a.user_id
     where p.created_at >= now() - ($1::int * interval '1 day')
       and ($2::text is null or p.status = $2::text)
     order by p.created_at desc
     limit $3`,
    [days, status, limit],
  );
  return rows.map((row) => ({
    id: String(row.id),
    applicationId: String(row.application_id),
    reference: String(row.reference),
    email: row.email ? String(row.email) : null,
    provider: String(row.provider),
    method: row.method ? String(row.method) : null,
    status: String(row.status),
    amount: num(row.amount),
    refundedAmount: num(row.refunded_amount),
    currency: String(row.currency ?? "EGP").trim(),
    createdAt: isoOrNull(row.created_at) ?? "",
    processedAt: isoOrNull(row.processed_at),
  }));
}
