import "server-only";
import { num, sql } from "@/lib/data/db";

export function insightDays(value: unknown) {
  const days = Number(value);
  return days === 7 || days === 90 ? days : 30;
}

export type Insights = {
  days: number;
  revenueNow: number;
  revenuePrevious: number;
  applications: number;
  approved: number;
  rejected: number;
  onTime: number;
  late: number;
  avgHours: number;
  reviewRating: number;
  reviewCount: number;
  paid: number;
  refunded: number;
  failed: number;
  pending: number;
  revenueDays: { day: string; revenue: number; n: number }[];
  applicationDays: { day: string; n: number }[];
  processingDays: { day: string; hours: number }[];
  funnel: { label: string; n: number }[];
  statuses: { label: string; n: number }[];
  geography: { label: string; n: number }[];
  destinations: { label: string; n: number; revenue: number }[];
  payments: { label: string; n: number; total: number }[];
  staff: { label: string; processed: number; approved: number; hours: number }[];
  documentRejections: { label: string; n: number }[];
};

const funnelLabels: Record<string, string> = {
  view_visa: "شاهد التأشيرة",
  begin_application: "بدأ الطلب",
  travelers_done: "المسافرون",
  documents_done: "المستندات",
  reach_payment: "وصل للدفع",
  payment_start: "بدأ الدفع",
  payment_success: "اكتمل الدفع",
  payment_failed: "فشل الدفع",
  offer_click: "عرض إضافي",
};

export async function getInsights(days: number): Promise<Insights> {
  const [totals, revenueDays, applicationDays, processingDays, funnel, statuses, geography, destinations, payments, staff, documentRejections, reviews] = await Promise.all([
    sql<{
      revenue_now: string;
      revenue_previous: string;
      applications: number;
      approved: number;
      rejected: number;
      on_time: number;
      late: number;
      avg_hours: string;
      paid: number;
      refunded: number;
      failed: number;
      pending: number;
    }>(
      `select
         coalesce((select sum(total_amount) from applications where paid_at >= now() - ($1::int * interval '1 day')), 0) as revenue_now,
         coalesce((select sum(total_amount) from applications where paid_at < now() - ($1::int * interval '1 day') and paid_at >= now() - (($1::int * 2) * interval '1 day')), 0) as revenue_previous,
         (select count(*)::int from applications where created_at >= now() - ($1::int * interval '1 day')) as applications,
         (select count(*)::int from applications where status = 'approved' and updated_at >= now() - ($1::int * interval '1 day')) as approved,
         (select count(*)::int from applications where status = 'rejected' and updated_at >= now() - ($1::int * interval '1 day')) as rejected,
         (select count(*)::int from applications where status in ('approved', 'rejected') and updated_at >= now() - ($1::int * interval '1 day') and (guaranteed_at is null or updated_at <= guaranteed_at)) as on_time,
         (select count(*)::int from applications where status in ('approved', 'rejected') and updated_at >= now() - ($1::int * interval '1 day') and guaranteed_at is not null and updated_at > guaranteed_at) as late,
         coalesce((select avg(extract(epoch from (updated_at - created_at)) / 3600) from applications where status in ('approved', 'rejected') and updated_at >= now() - ($1::int * interval '1 day')), 0) as avg_hours,
         (select count(*)::int from payments where status = 'paid' and created_at >= now() - ($1::int * interval '1 day')) as paid,
         (select count(*)::int from payments where status = 'refunded' and created_at >= now() - ($1::int * interval '1 day')) as refunded,
         (select count(*)::int from payments where status = 'failed' and created_at >= now() - ($1::int * interval '1 day')) as failed,
         (select count(*)::int from payments where status = 'pending' and created_at >= now() - ($1::int * interval '1 day')) as pending`,
      [days],
    ),
    sql<{ day: string; revenue: string; n: number }>(
      `select to_char(paid_at, 'YYYY-MM-DD') as day, coalesce(sum(total_amount), 0) as revenue, count(*)::int as n
       from applications
       where paid_at is not null and paid_at >= now() - ($1::int * interval '1 day')
       group by 1 order by 1`,
      [days],
    ),
    sql<{ day: string; n: number }>(
      `select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int as n
       from applications
       where created_at >= now() - ($1::int * interval '1 day')
       group by 1 order by 1`,
      [days],
    ),
    sql<{ day: string; hours: string }>(
      `select to_char(updated_at, 'YYYY-MM-DD') as day,
              coalesce(avg(extract(epoch from (updated_at - created_at)) / 3600), 0) as hours
       from applications
       where status in ('approved', 'rejected') and updated_at >= now() - ($1::int * interval '1 day')
       group by 1 order by 1`,
      [days],
    ),
    sql<{ name: string; n: number }>(
      `select name, count(*)::int as n from funnel_events
       where created_at >= now() - ($1::int * interval '1 day')
       group by name order by n desc`,
      [days],
    ),
    sql<{ status: string; n: number }>(
      `select status, count(*)::int as n from applications
       where created_at >= now() - ($1::int * interval '1 day')
       group by status order by n desc`,
      [days],
    ),
    sql<{ label: string; n: number }>(
      `select coalesce(nullif(t.nationality, ''), 'غير محدد') as label, count(*)::int as n
       from travelers t
       join applications a on a.id = t.application_id
       where a.created_at >= now() - ($1::int * interval '1 day')
       group by 1 order by n desc limit 12`,
      [days],
    ),
    sql<{ label: string; n: number; revenue: string }>(
      `select d.name as label, count(*)::int as n,
              coalesce(sum(a.total_amount) filter (where a.paid_at is not null), 0) as revenue
       from applications a
       join destinations d on d.id = a.destination_id
       where a.created_at >= now() - ($1::int * interval '1 day')
       group by d.name order by n desc limit 8`,
      [days],
    ),
    sql<{ label: string; n: number; total: string }>(
      `select provider || ' · ' || status as label, count(*)::int as n, coalesce(sum(amount), 0) as total
       from payments
       where created_at >= now() - ($1::int * interval '1 day')
       group by provider, status order by n desc`,
      [days],
    ),
    sql<{ label: string; processed: number; approved: number; hours: string }>(
      `select coalesce(p.full_name, p.email) as label,
              count(a.id) filter (where a.status in ('approved', 'rejected'))::int as processed,
              count(a.id) filter (where a.status = 'approved')::int as approved,
              coalesce(avg(extract(epoch from (a.updated_at - a.created_at)) / 3600) filter (where a.status in ('approved', 'rejected')), 0) as hours
       from profiles p
       left join applications a on a.assignee_id = p.id and a.updated_at >= now() - ($1::int * interval '1 day')
       where p.role in ('super_admin', 'admin', 'manager', 'operator', 'support')
       group by p.id, p.full_name, p.email
       order by processed desc
       limit 12`,
      [days],
    ),
    sql<{ label: string; n: number }>(
      `select coalesce(nullif(reject_reason, ''), 'بدون سبب') as label, count(*)::int as n
       from documents
       where status = 'rejected' and created_at >= now() - ($1::int * interval '1 day')
       group by 1 order by n desc limit 8`,
      [days],
    ),
    sql<{ rating: string; n: number }>(
      `select coalesce(avg(rating), 0) as rating, count(*)::int as n
       from reviews
       where published_at >= current_date - $1::int`,
      [days],
    ),
  ]);
  const total = totals[0];
  return {
    days,
    revenueNow: num(total?.revenue_now),
    revenuePrevious: num(total?.revenue_previous),
    applications: total?.applications ?? 0,
    approved: total?.approved ?? 0,
    rejected: total?.rejected ?? 0,
    onTime: total?.on_time ?? 0,
    late: total?.late ?? 0,
    avgHours: num(total?.avg_hours),
    reviewRating: num(reviews[0]?.rating),
    reviewCount: reviews[0]?.n ?? 0,
    paid: total?.paid ?? 0,
    refunded: total?.refunded ?? 0,
    failed: total?.failed ?? 0,
    pending: total?.pending ?? 0,
    revenueDays: revenueDays.map((row) => ({ day: row.day, revenue: num(row.revenue), n: row.n })),
    applicationDays: applicationDays.map((row) => ({ day: row.day, n: row.n })),
    processingDays: processingDays.map((row) => ({ day: row.day, hours: Math.round(num(row.hours) * 10) / 10 })),
    funnel: funnel.map((row) => ({ label: funnelLabels[row.name] ?? row.name, n: row.n })),
    statuses: statuses.map((row) => ({ label: row.status, n: row.n })),
    geography: geography.map((row) => ({ label: row.label, n: row.n })),
    destinations: destinations.map((row) => ({ label: row.label, n: row.n, revenue: num(row.revenue) })),
    payments: payments.map((row) => ({ label: row.label, n: row.n, total: num(row.total) })),
    staff: staff.map((row) => ({ label: row.label, processed: row.processed, approved: row.approved, hours: Math.round(num(row.hours) * 10) / 10 })),
    documentRejections: documentRejections.map((row) => ({ label: row.label, n: row.n })),
  };
}

export function insightSheets(data: Insights) {
  return [
    {
      name: "الإيرادات",
      rows: [
        ["اليوم", "الإيراد", "عمليات مدفوعة"],
        ...data.revenueDays.map((row) => [row.day, row.revenue, row.n]),
      ],
    },
    {
      name: "التشغيل",
      rows: [
        ["المؤشر", "القيمة"],
        ["الطلبات", data.applications],
        ["مقبول", data.approved],
        ["مرفوض", data.rejected],
        ["في الموعد", data.onTime],
        ["متأخر", data.late],
        ["متوسط الساعات", data.avgHours],
        ["اليوم", "الطلبات"],
        ...data.applicationDays.map((row) => [row.day, row.n]),
      ],
    },
    {
      name: "الموظفون",
      rows: [
        ["الموظف", "معالج", "مقبول", "متوسط الساعات"],
        ...data.staff.map((row) => [row.label, row.processed, row.approved, row.hours]),
      ],
    },
    {
      name: "الجودة",
      rows: [
        ["المؤشر", "القيمة"],
        ["معدل القبول", data.approved + data.rejected === 0 ? 0 : Math.round((data.approved / (data.approved + data.rejected)) * 100)],
        ["مدفوع", data.paid],
        ["مسترد", data.refunded],
        ["فاشل", data.failed],
        ["متوسط تقييم الموقع", data.reviewRating],
        ["سبب رفض المستند", "العدد"],
        ...data.documentRejections.map((row) => [row.label, row.n]),
      ],
    },
  ];
}
