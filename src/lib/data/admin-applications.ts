import "server-only";
import { iso, num, one, sql } from "./db";

export type ApplicationSignals = {
  verified: number;
  uploaded: number;
  rejected: number;
  missing: number;
  paymentReview: boolean;
  refundOpen: boolean;
};

export type ApplicationCustomer = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  banned: boolean;
  createdAt: string;
  applications: number;
};

const requiredKindsSql = `
  case
    when a.requirements_locked is not null and jsonb_typeof(a.requirements_locked) = 'array' and jsonb_array_length(a.requirements_locked) > 0 then a.requirements_locked
    when vo.documents is not null and jsonb_typeof(vo.documents) = 'array' and jsonb_array_length(vo.documents) > 0 then vo.documents
    when jsonb_typeof(d.documents) = 'array' and jsonb_array_length(d.documents) > 0 then d.documents
    else '["passport"]'::jsonb
  end`;

/** Document counts and attention flags for a page of applications, keyed by application id. */
export async function applicationSignals(ids: string[]): Promise<Record<string, ApplicationSignals>> {
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!clean.length) return {};
  const rows = await sql<Record<string, unknown>>(
    `select a.id,
       (select count(*)::int from documents doc where doc.application_id = a.id and doc.kind <> 'issued_visa' and doc.status = 'verified') as verified,
       (select count(*)::int from documents doc where doc.application_id = a.id and doc.kind <> 'issued_visa' and doc.status = 'uploaded') as uploaded,
       (select count(*)::int from documents doc where doc.application_id = a.id and doc.kind <> 'issued_visa' and doc.status = 'rejected') as rejected,
       (select count(*)::int
          from travelers t
          cross join lateral jsonb_array_elements_text(${requiredKindsSql}) as req(kind)
          where t.application_id = a.id
            and not exists (
              select 1 from documents doc
              where doc.application_id = a.id and doc.traveler_id = t.id and doc.kind = req.kind
            )) as missing,
       exists (
         select 1 from application_events ev
         where ev.application_id = a.id and ev.internal = true and ev.title = 'Payment needs review'
       ) as payment_review,
       exists (
         select 1 from refund_requests rr where rr.application_id = a.id and rr.status = 'open'
       ) as refund_open
     from applications a
     join destinations d on d.id = a.destination_id
     left join visa_options vo on vo.id = a.visa_option_id
     where a.id = any($1::uuid[])`,
    [clean],
  );
  const result: Record<string, ApplicationSignals> = {};
  for (const row of rows) {
    result[String(row.id)] = {
      verified: num(row.verified),
      uploaded: num(row.uploaded),
      rejected: num(row.rejected),
      missing: num(row.missing),
      paymentReview: Boolean(row.payment_review),
      refundOpen: Boolean(row.refund_open),
    };
  }
  return result;
}

export async function applicationCustomer(userId: string): Promise<ApplicationCustomer | null> {
  const row = await one<Record<string, unknown>>(
    `select p.id, p.email, p.full_name, p.phone, p.banned, p.created_at,
       (select count(*)::int from applications a where a.user_id = p.id) as applications
     from profiles p where p.id = $1`,
    [userId],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: (row.full_name as string) || null,
    phone: (row.phone as string) || null,
    banned: Boolean(row.banned),
    createdAt: iso(row.created_at),
    applications: num(row.applications),
  };
}

/** Database clock, so SLA figures match the SQL `now()` used by the queue filters. */
export async function databaseNow() {
  const row = await one<{ now: unknown }>("select now() as now");
  return row ? iso(row.now) : new Date(0).toISOString();
}
