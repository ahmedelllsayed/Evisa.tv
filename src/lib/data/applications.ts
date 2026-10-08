import "server-only";
import { randomInt } from "node:crypto";
import type {
  Application,
  ApplicationDocument,
  ApplicationEvent,
  ApplicationStatus,
  ApplicationStep,
  Payment,
  Traveler,
} from "@/lib/types";
import { documentGaps } from "@/lib/application-rules";
import { t, tf, type MessageKey } from "@/lib/i18n";
import { sendMail } from "@/lib/email";
import { formatAt, governmentFeeCharged, guaranteedDate } from "@/lib/visa";
import { getDestinationById } from "./catalog";
import { day, getDb, iso, isoOrNull, json, num, numOrNull, one, sql } from "./db";

type Row = Record<string, unknown>;

const APP_SELECT = `
  select a.*, d.name as destination_name, d.slug as destination_slug, d.flag as destination_flag,
         d.image as destination_image, d.documents as destination_documents, p.email as user_email,
         assignee.email as assignee_email
  from applications a
  join destinations d on d.id = a.destination_id
  join profiles p on p.id = a.user_id
  left join profiles assignee on assignee.id = a.assignee_id`;

function toApplication(r: Row): Application {
  return {
    id: String(r.id),
    reference: String(r.reference),
    userId: String(r.user_id),
    userEmail: (r.user_email as string) ?? undefined,
    destinationId: String(r.destination_id),
    destinationName: String(r.destination_name),
    destinationSlug: String(r.destination_slug),
    destinationFlag: (r.destination_flag as string) ?? null,
    destinationImage: (r.destination_image as string) ?? null,
    documentsRequired: json<string[]>(r.destination_documents, []),
    status: r.status as ApplicationStatus,
    step: r.step as ApplicationStep,
    departureDate: day(r.departure_date),
    express: Boolean(r.express),
    guaranteedAt: isoOrNull(r.guaranteed_at),
    travelerCount: num(r.traveler_count),
    govFee: num(r.gov_fee),
    serviceFee: num(r.service_fee),
    totalAmount: num(r.total_amount),
    currency: String(r.currency).trim(),
    paidAt: isoOrNull(r.paid_at),
    deliveredAt: isoOrNull(r.delivered_at),
    assigneeId: (r.assignee_id as string) ?? null,
    assigneeEmail: (r.assignee_email as string) ?? null,
    locale: String(r.locale ?? "en-EG"),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function newReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "ATL-" + Array.from({ length: 7 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export async function createApplication(input: {
  userId: string;
  destinationId: string;
  departureDate: string | null;
  express: boolean;
  locale?: string;
}) {
  const d = await getDestinationById(input.destinationId);
  if (!d || !d.isActive || !d.visaRequired) throw new Error("This destination is not available for applications");
  const express = input.express && d.expressHours !== null;
  const hours = express ? d.expressHours! : (d.processingHours ?? 72);
  const govFee = governmentFeeCharged(d);
  const serviceFee = d.serviceFee + (express ? (d.expressFee ?? 0) : 0);
  const row = await one<{ id: string }>(
    `insert into applications (reference, user_id, destination_id, departure_date, express, guaranteed_at,
       gov_fee, service_fee, total_amount, currency, locale)
     values ($1,$2,$3,$4::date,$5,$6::timestamptz,$7,$8,$9,$10,$11) returning id`,
    [
      newReference(), input.userId, d.id, input.departureDate, express, guaranteedDate(hours).toISOString(),
      govFee, serviceFee, govFee + serviceFee, d.currency, input.locale || "en-EG",
    ],
  );
  await addEvent(row!.id, { status: "draft", title: "Application started", description: `${d.name} visa application created` });
  return row!.id;
}

export async function getApplication(id: string) {
  const r = await one(`${APP_SELECT} where a.id = $1`, [id]);
  return r ? toApplication(r) : null;
}

export async function listApplicationsForUser(userId: string) {
  return (await sql(`${APP_SELECT} where a.user_id = $1 order by a.created_at desc`, [userId])).map(toApplication);
}

export async function findOpenApplication(userId: string, destinationId: string) {
  const r = await one(
    `${APP_SELECT} where a.user_id = $1 and a.destination_id = $2 and a.status in ('draft', 'payment_pending')
     order by a.created_at desc limit 1`,
    [userId, destinationId],
  );
  return r ? toApplication(r) : null;
}

export async function listAllApplications(filter: {
  status?: string;
  q?: string;
  queue?: QueueFilter;
  assigneeId?: string;
  destination?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`a.status = $${params.length}`);
  }
  if (filter.q) {
    params.push(`%${filter.q.toLowerCase()}%`);
    where.push(`(lower(a.reference) like $${params.length} or lower(p.email) like $${params.length} or lower(d.name) like $${params.length})`);
  }
  const open = "a.status not in ('approved', 'rejected', 'cancelled', 'refunded')";
  if (filter.queue === "mine" && filter.assigneeId) {
    params.push(filter.assigneeId);
    where.push(`a.assignee_id = $${params.length}::uuid`, open);
  } else if (filter.queue === "unassigned") {
    where.push("a.assignee_id is null", "a.status <> 'draft'", open);
  } else if (filter.queue === "late") {
    where.push("a.guaranteed_at is not null", "a.guaranteed_at < now()", open);
  } else if (filter.queue === "documents") {
    where.push("exists (select 1 from documents doc where doc.application_id = a.id and doc.status in ('uploaded', 'rejected') and doc.kind <> 'issued_visa')");
  } else if (filter.queue === "paid_review") {
    where.push("a.paid_at is not null", "a.status = 'submitted'");
  } else if (filter.queue === "attention") {
    where.push(
      "a.status not in ('approved', 'rejected', 'cancelled', 'refunded')",
      `(
        (a.guaranteed_at is not null and a.guaranteed_at < now())
        or (a.assignee_id is null and a.status <> 'draft')
        or exists (select 1 from documents doc where doc.application_id = a.id and doc.status in ('uploaded', 'rejected') and doc.kind <> 'issued_visa')
        or (a.paid_at is not null and a.status = 'submitted')
        or ${paymentReviewSql}
        or ${refundRequestSql}
      )`,
    );
  }
  if (filter.destination) {
    params.push(filter.destination);
    where.push(`d.slug = $${params.length}`);
  }
  if (filter.from) {
    params.push(filter.from);
    where.push(`a.created_at >= $${params.length}::date`);
  }
  if (filter.to) {
    params.push(filter.to);
    where.push(`a.created_at < ($${params.length}::date + interval '1 day')`);
  }
  const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
  const offset = Math.max(0, filter.offset ?? 0);
  params.push(limit, offset);
  const rows = await sql(
    `${APP_SELECT} ${where.length ? "where " + where.join(" and ") : ""} order by a.created_at desc limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return rows.map(toApplication);
}

export async function countApplications(filter: { status?: string; q?: string } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`a.status = $${params.length}`);
  }
  if (filter.q) {
    params.push(`%${filter.q.toLowerCase()}%`);
    where.push(`(lower(a.reference) like $${params.length} or lower(p.email) like $${params.length} or lower(d.name) like $${params.length})`);
  }
  const row = await one<{ n: number }>(
    `select count(*)::int as n from applications a join profiles p on p.id = a.user_id join destinations d on d.id = a.destination_id ${where.length ? "where " + where.join(" and ") : ""}`,
    params,
  );
  return row?.n ?? 0;
}

export async function applicationsByDay() {
  return sql<{ day: string; n: number }>(
    `select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int as n
     from applications where created_at > now() - interval '30 days'
     group by 1 order by 1`,
  );
}

export async function applicationStats() {
  const rows = await sql<{ status: string; n: number; revenue: string | null }>(
    "select status, count(*)::int as n, sum(case when paid_at is not null then total_amount end) as revenue from applications group by status",
  );
  return rows.map((r) => ({ status: r.status, count: r.n, revenue: num(r.revenue) }));
}

export async function setStep(id: string, step: ApplicationStep) {
  const rows = await sql(
    `update applications set step = $2, updated_at = now() where id = $1 and status in ${editableStatusSql} returning id`,
    [id, step],
  );
  return rows.length > 0;
}

const statusMail: Record<string, string> = {
  draft: "Draft",
  payment_pending: "Awaiting payment",
  submitted: "Submitted",
  in_review: "In review",
  filed: "Ready for manual filing",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export async function setStatus(id: string, status: ApplicationStatus, event?: { title: string; description?: string; onTime?: boolean }) {
  if (status === "filed") {
    const current = await getApplication(id);
    if (!current) return { ok: false as const, error: "الطلب غير موجود." };
    const [travelers, documents] = await Promise.all([listTravelers(id), listDocuments(id)]);
    if (documentGaps(current.documentsRequired, travelers, documents.filter((document) => document.kind !== "issued_visa")).length > 0) {
      return { ok: false as const, error: "لا يمكن التقديم وفي المستندات نقص أو رفض." };
    }
  }
  await sql(
    `update applications set status = $2, updated_at = now(),
       delivered_at = case when $2 = 'approved' then now() else delivered_at end
     where id = $1`,
    [id, status],
  );
  if (event) await addEvent(id, { status, ...event });
  const app = await getApplication(id);
  if (app?.userEmail) {
    const locale = app.locale || "en-EG";
    const statusLabel = t(locale, `status.${status}` as MessageKey);
    const when = app.guaranteedAt ? formatAt(app.guaranteedAt, locale) : "—";
    await sendMail({
      to: app.userEmail,
      subject: tf(locale, "mail.statusSubject", { ref: app.reference, status: statusLabel }),
      text: tf(locale, "mail.statusBody", { ref: app.reference, status: statusLabel, date: when }),
    });
  }
  return { ok: true as const };
}

export async function setAssignee(id: string, assigneeId: string | null) {
  await sql("update applications set assignee_id = $2, updated_at = now() where id = $1", [id, assigneeId]);
}

const closedSql = "('approved', 'rejected', 'cancelled', 'refunded')";
const paymentReviewSql = `exists (
  select 1 from application_events ev
  where ev.application_id = a.id and ev.internal = true and ev.title = 'Payment needs review'
)`;
const refundRequestSql = `exists (
  select 1 from refund_requests rr
  where rr.application_id = a.id and rr.status = 'open'
)`;
const editableStatusSql = "('draft', 'payment_pending')";

export type QueueFilter = "attention" | "mine" | "unassigned" | "late" | "documents" | "paid_review";

export async function queueCounts(assigneeId: string) {
  const row = await one<{ mine: number; unassigned: number; late: number; documents: number; paid_review: number }>(
    `select
       (select count(*)::int from applications where assignee_id = $1 and status not in ${closedSql}) as mine,
       (select count(*)::int from applications where assignee_id is null and status not in ('draft', 'approved', 'rejected', 'cancelled', 'refunded')) as unassigned,
       (select count(*)::int from applications where guaranteed_at is not null and guaranteed_at < now() and status not in ${closedSql}) as late,
       (select count(distinct application_id)::int from documents where status in ('uploaded', 'rejected') and kind <> 'issued_visa') as documents,
       (select count(*)::int from applications where paid_at is not null and status = 'submitted') as paid_review`,
    [assigneeId],
  );
  return {
    mine: row?.mine ?? 0,
    unassigned: row?.unassigned ?? 0,
    late: row?.late ?? 0,
    documents: row?.documents ?? 0,
    paidReview: row?.paid_review ?? 0,
  };
}

export async function opsCounts() {
  const [late, pending, attention] = await Promise.all([
    one<{ n: number }>(
      `select count(*)::int as n from applications
       where guaranteed_at is not null and guaranteed_at < now()
         and status not in ${closedSql}`,
    ),
    one<{ n: number }>("select count(*)::int as n from documents where status = 'uploaded' and kind <> 'issued_visa'"),
    one<{ n: number }>(
      `select count(*)::int as n from applications a
       where a.status not in ${closedSql}
         and (
           (a.guaranteed_at is not null and a.guaranteed_at < now())
           or (a.assignee_id is null and a.status <> 'draft')
           or exists (select 1 from documents d where d.application_id = a.id and d.status in ('uploaded', 'rejected') and d.kind <> 'issued_visa')
           or (a.paid_at is not null and a.status = 'submitted')
           or ${paymentReviewSql}
           or ${refundRequestSql}
         )`,
    ),
  ]);
  return { late: late?.n ?? 0, pendingDocuments: pending?.n ?? 0, attention: attention?.n ?? 0 };
}

// ----- Travelers -----

function toTraveler(r: Row): Traveler {
  return {
    id: String(r.id),
    applicationId: String(r.application_id),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    sex: (r.sex as string) ?? null,
    dateOfBirth: day(r.date_of_birth),
    nationality: r.nationality ? String(r.nationality).trim() : null,
    passportNumber: (r.passport_number as string) ?? null,
    passportExpiry: day(r.passport_expiry),
    sortOrder: num(r.sort_order),
  };
}

export async function listTravelers(applicationId: string) {
  return (await sql("select * from travelers where application_id = $1 order by sort_order, created_at", [applicationId])).map(toTraveler);
}

export type TravelerInput = Omit<Traveler, "id" | "applicationId" | "sortOrder"> & { id?: string };

/** Replaces the traveler list, keeping ids (and their documents) for travelers that still exist. */
export async function patchTraveler(id: string, input: { firstName: string; lastName: string; passportNumber: string; nationality: string }) {
  await sql(
    `update travelers set first_name = $2, last_name = $3, passport_number = $4, nationality = nullif($5, '') where id = $1`,
    [id, input.firstName.trim(), input.lastName.trim(), input.passportNumber.trim() || null, input.nationality.trim().toUpperCase()],
  );
}

export async function saveTravelers(
  applicationId: string,
  travelers: TravelerInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.query<{ status: string; traveler_count: number }>(
      "select status, traveler_count from applications where id = $1 for update",
      [applicationId],
    );
    if (!current) return { ok: false as const, error: "Application not found." };
    if (current.status !== "draft" && current.status !== "payment_pending") {
      return { ok: false as const, error: "This application can no longer be edited." };
    }
    const [charge] = await tx.query(
      "select 1 from payments where application_id = $1 and status in ('pending', 'paid') limit 1",
      [applicationId],
    );
    if (charge && travelers.length !== num(current.traveler_count)) {
      return { ok: false as const, error: "The number of travellers is locked because a payment has already been started." };
    }
    const keep = travelers.map((t) => t.id).filter(Boolean) as string[];
    if (charge) {
      const existing = await tx.query<{ id: string }>("select id from travelers where application_id = $1", [applicationId]);
      const existingIds = new Set(existing.map((row) => String(row.id)));
      const samePeople = keep.length === travelers.length && keep.length === existingIds.size && keep.every((id) => existingIds.has(id));
      if (!samePeople) {
        return { ok: false as const, error: "The number of travellers is locked because a payment has already been started." };
      }
    }
    await tx.query(
      `delete from travelers where application_id = $1 ${keep.length ? "and not (id = any($2::uuid[]))" : ""}`,
      keep.length ? [applicationId, `{${keep.join(",")}}`] : [applicationId],
    );
    for (const [i, t] of travelers.entries()) {
      const dateOfBirth = t.dateOfBirth?.trim() ? t.dateOfBirth.trim() : null;
      const passportExpiry = t.passportExpiry?.trim() ? t.passportExpiry.trim() : null;
      const values = [t.firstName, t.lastName, t.sex, dateOfBirth, t.nationality, t.passportNumber, passportExpiry, i];
      if (t.id) {
        await tx.query(
          `update travelers set first_name=$3, last_name=$4, sex=$5, date_of_birth=$6::date, nationality=$7,
             passport_number=$8, passport_expiry=$9::date, sort_order=$10 where id=$1 and application_id=$2`,
          [t.id, applicationId, ...values],
        );
      } else {
        await tx.query(
          `insert into travelers (application_id, first_name, last_name, sex, date_of_birth, nationality, passport_number, passport_expiry, sort_order)
           values ($1,$2,$3,$4,$5::date,$6,$7,$8::date,$9)`,
          [applicationId, ...values],
        );
      }
    }
    if (!charge) {
      const a = await tx.query<{ gov_fee: string; service_fee: string; traveler_count: number }>(
        "select gov_fee, service_fee, traveler_count from applications where id = $1",
        [applicationId],
      );
      const count = Math.max(1, travelers.length);
      const perTravelerGov = num(a[0].gov_fee) / Math.max(1, a[0].traveler_count);
      const perTravelerService = num(a[0].service_fee) / Math.max(1, a[0].traveler_count);
      await tx.query(
        `update applications set traveler_count = $2, gov_fee = $3, service_fee = $4, total_amount = $3::numeric + $4::numeric, updated_at = now() where id = $1`,
        [applicationId, count, perTravelerGov * count, perTravelerService * count],
      );
    }
    return { ok: true as const };
  });
}

// ----- Documents -----

function toDocument(r: Row): ApplicationDocument {
  return {
    id: String(r.id),
    applicationId: String(r.application_id),
    travelerId: (r.traveler_id as string) ?? null,
    kind: String(r.kind),
    storagePath: String(r.storage_path),
    fileName: String(r.file_name),
    mimeType: (r.mime_type as string) ?? null,
    sizeBytes: numOrNull(r.size_bytes),
    status: r.status as ApplicationDocument["status"],
    rejectReason: (r.reject_reason as string) ?? null,
    createdAt: iso(r.created_at),
  };
}

export async function listDocuments(applicationId: string) {
  return (await sql("select * from documents where application_id = $1 order by created_at", [applicationId])).map(toDocument);
}

export async function getDocument(id: string) {
  const r = await one("select * from documents where id = $1", [id]);
  return r ? toDocument(r) : null;
}

export async function addDocument(input: Omit<ApplicationDocument, "id" | "status" | "createdAt" | "rejectReason"> & { issuedByAdmin?: boolean }) {
  if (input.kind === "issued_visa" && !input.issuedByAdmin) {
    throw new Error("That document is issued by our team.");
  }
  if (input.kind !== "issued_visa") {
    const app = await one<{ status: string }>("select status from applications where id = $1", [input.applicationId]);
    if (!app || (app.status !== "draft" && app.status !== "payment_pending")) {
      throw new Error("This application can no longer be edited.");
    }
  }
  await sql(
    `delete from documents where application_id = $1 and kind = $2 and traveler_id is not distinct from $3::uuid`,
    [input.applicationId, input.kind, input.travelerId],
  );
  const r = await one(
    `insert into documents (application_id, traveler_id, kind, storage_path, file_name, mime_type, size_bytes)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [input.applicationId, input.travelerId, input.kind, input.storagePath, input.fileName, input.mimeType, input.sizeBytes],
  );
  return toDocument(r!);
}

export async function deleteDocument(id: string, opts?: { allowIssuedVisa?: boolean }) {
  const doc = await getDocument(id);
  if (!doc) return;
  const app = await one<{ status: string }>("select status from applications where id = $1", [doc.applicationId]);
  if (doc.kind === "issued_visa") {
    if (!opts?.allowIssuedVisa) throw new Error("That document is issued by our team.");
  } else if (!app || (app.status !== "draft" && app.status !== "payment_pending")) {
    throw new Error("This application can no longer be edited.");
  }
  await sql("delete from documents where id = $1", [id]);
}

export async function setDocumentStatus(id: string, status: ApplicationDocument["status"], reason?: string) {
  if (status === "rejected" && !reason?.trim()) return { ok: false as const, error: "اكتب سبب الرفض." };
  await sql("update documents set status = $2, reject_reason = $3 where id = $1", [
    id,
    status,
    status === "rejected" ? reason!.trim() : null,
  ]);
  return { ok: true as const };
}

// ----- Timeline -----

export async function addEvent(
  applicationId: string,
  e: { status?: string | null; title: string; description?: string | null; onTime?: boolean; internal?: boolean },
) {
  await sql(
    "insert into application_events (application_id, status, title, description, on_time, internal) values ($1,$2,$3,$4,$5,$6)",
    [applicationId, e.status ?? null, e.title, e.description ?? null, e.onTime ?? true, e.internal ?? false],
  );
  await sql("update applications set updated_at = now() where id = $1", [applicationId]);
}

export async function listEvents(applicationId: string, opts: { publicOnly?: boolean } = {}): Promise<ApplicationEvent[]> {
  const rows = await sql(
    `select * from application_events where application_id = $1 ${opts.publicOnly ? "and internal = false" : ""} order by created_at, id`,
    [applicationId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    applicationId: String(r.application_id),
    status: (r.status as string) ?? null,
    title: String(r.title),
    description: (r.description as string) ?? null,
    onTime: Boolean(r.on_time),
    internal: Boolean(r.internal),
    createdAt: iso(r.created_at),
  }));
}

// ----- Payments -----

function toPayment(r: Row): Payment {
  return {
    id: String(r.id),
    applicationId: String(r.application_id),
    provider: String(r.provider),
    providerRef: (r.provider_ref as string) ?? null,
    amount: num(r.amount),
    currency: String(r.currency).trim(),
    status: r.status as Payment["status"],
    createdAt: iso(r.created_at),
    transactionId: (r.transaction_id as string) ?? null,
    checkoutUrl: (r.checkout_url as string) ?? null,
    merchantOrderId: (r.merchant_order_id as string) ?? null,
    paymobOrderId: (r.paymob_order_id as string) ?? null,
  };
}

export async function createPayment(input: {
  applicationId: string;
  provider: string;
  providerRef: string;
  amount: number;
  currency: string;
  merchantOrderId?: string | null;
  paymobOrderId?: string | null;
  method?: string | null;
  billingName?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  checkoutUrl?: string | null;
}) {
  await sql(
    `insert into payments (
       application_id, provider, provider_ref, amount, currency, merchant_order_id, paymob_order_id, method, billing_name, billing_email, billing_phone, checkout_url
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (provider, provider_ref) do update set
       amount = excluded.amount,
       currency = excluded.currency,
       merchant_order_id = coalesce(excluded.merchant_order_id, payments.merchant_order_id),
       paymob_order_id = coalesce(excluded.paymob_order_id, payments.paymob_order_id),
       method = coalesce(excluded.method, payments.method),
       billing_name = coalesce(excluded.billing_name, payments.billing_name),
       billing_email = coalesce(excluded.billing_email, payments.billing_email),
       billing_phone = coalesce(excluded.billing_phone, payments.billing_phone),
       checkout_url = coalesce(excluded.checkout_url, payments.checkout_url)
     where payments.status = 'pending'`,
    [
      input.applicationId, input.provider, input.providerRef, input.amount, input.currency,
      input.merchantOrderId ?? null, input.paymobOrderId ?? null, input.method ?? null,
      input.billingName ?? null, input.billingEmail ?? null, input.billingPhone ?? null,
      input.checkoutUrl ?? null,
    ],
  );
  await sql("update applications set status = 'payment_pending', step = 'payment', updated_at = now() where id = $1 and status = 'draft'", [
    input.applicationId,
  ]);
}

export async function listPayments(applicationId: string) {
  return (await sql("select * from payments where application_id = $1 order by created_at desc", [applicationId])).map(toPayment);
}

export async function findPendingPayment(applicationId: string) {
  const row = await one(
    "select * from payments where application_id = $1 and status = 'pending' order by created_at desc limit 1",
    [applicationId],
  );
  return row ? toPayment(row) : null;
}

export async function getPaymentByMerchantOrder(merchantOrderId: string) {
  const row = await one("select * from payments where merchant_order_id = $1 or provider_ref = $1 limit 1", [merchantOrderId]);
  return row ? toPayment(row) : null;
}

export async function getPaymentByProviderRef(provider: string, providerRef: string) {
  const row = await one("select * from payments where provider = $1 and provider_ref = $2", [provider, providerRef]);
  return row ? toPayment(row) : null;
}

/** Idempotent. A payment can move an application to submitted only from draft or payment_pending, and only for the stored amount. */
export async function markPaid(provider: string, providerRef: string, expectedAmount?: number) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx.query<Row>("select * from payments where provider = $1 and provider_ref = $2", [provider, providerRef]);
    if (!existing) return false;
    const payment = toPayment(existing);
    if (expectedAmount != null && Math.abs(payment.amount - expectedAmount) > 0.01) return false;
    if (payment.status === "paid") return true;
    if (payment.status !== "pending") return false;
    const [app] = await tx.query<Row>("select status from applications where id = $1", [payment.applicationId]);
    const status = String(app?.status ?? "");
    if (status !== "draft" && status !== "payment_pending") return false;
    await tx.query("update payments set status = 'paid', processed_at = now() where id = $1 and status = 'pending'", [payment.id]);
    await tx.query(
      `update applications set status = 'submitted', step = 'done', paid_at = now(), updated_at = now()
       where id = $1 and status in ('draft', 'payment_pending')`,
      [payment.applicationId],
    );
    await tx.query(
      "insert into application_events (application_id, status, title, description) values ($1, 'submitted', $2, $3)",
      [payment.applicationId, "Payment received", "Your application is submitted and our team is checking your documents"],
    );
    return true;
  });
}

const PAYMENT_REVIEW_TITLE = "Payment needs review";

type Queryable = { query: <T = Row>(text: string, params?: unknown[]) => Promise<T[]> };

async function notePaymentReview(tx: Queryable, applicationId: string, description: string) {
  await tx.query(
    `insert into application_events (application_id, title, description, on_time, internal)
     select $1, $2, $3, false, true
     where not exists (
       select 1 from application_events
       where application_id = $1 and internal = true and title = $2 and description = $3
     )`,
    [applicationId, PAYMENT_REVIEW_TITLE, description],
  );
}

export async function applyPaymobCallback(input: {
  merchantOrderId: string;
  paymobOrderId: string | null;
  transactionId: string;
  amountCents: number;
  currency: string;
  success: boolean;
  pending: boolean;
  refunded: boolean;
  method: string | null;
}) {
  if (!input.paymobOrderId) return { ok: false as const, reason: "order" as const };
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx.query<Row>(
      "select * from payments where provider = 'paymob' and paymob_order_id = $1 limit 1",
      [input.paymobOrderId],
    );
    if (!existing) return { ok: false as const, reason: "missing" as const };
    const payment = toPayment(existing);
    if (input.merchantOrderId && payment.merchantOrderId && input.merchantOrderId !== payment.merchantOrderId) {
      await notePaymentReview(
        tx,
        payment.applicationId,
        `Paymob order ${input.paymobOrderId} arrived with merchant reference ${input.merchantOrderId}, which does not match the stored reference. The application was not marked paid.`,
      );
      return { ok: false as const, reason: "order" as const };
    }
    const currency = input.currency.trim().toUpperCase();
    if (!currency || currency !== payment.currency.toUpperCase()) {
      await notePaymentReview(
        tx,
        payment.applicationId,
        `Paymob reported currency ${currency || "unknown"} for order ${input.paymobOrderId}; the stored currency is ${payment.currency}. The application was not marked paid.`,
      );
      return { ok: false as const, reason: "currency" as const };
    }
    const expected = Math.round(payment.amount * 100);
    if (expected !== input.amountCents) {
      await notePaymentReview(
        tx,
        payment.applicationId,
        `Paymob reported ${input.amountCents} cents for order ${input.paymobOrderId}; the stored amount is ${expected} cents. The application was not marked paid.`,
      );
      return { ok: false as const, reason: "amount" as const };
    }
    if (payment.transactionId && payment.transactionId === input.transactionId && (payment.status === "paid" || payment.status === "refunded" || payment.status === "failed")) {
      return { ok: true as const, reason: "duplicate" as const };
    }
    if (input.refunded && payment.status === "paid") {
      await tx.query("update payments set status = 'refunded', transaction_id = $2, processed_at = now() where id = $1 and status = 'paid'", [
        payment.id,
        input.transactionId,
      ]);
      await tx.query(
        `update applications set status = 'refunded', updated_at = now()
         where id = $1 and status in ('draft', 'payment_pending', 'submitted', 'in_review', 'filed')`,
        [payment.applicationId],
      );
      return { ok: true as const, reason: "refunded" as const };
    }
    if (input.pending) return { ok: true as const, reason: "pending" as const };
    if (!input.success) {
      await tx.query(
        "update payments set status = 'failed', transaction_id = $2, method = coalesce($3, method), processed_at = now() where id = $1 and status = 'pending'",
        [payment.id, input.transactionId, input.method],
      );
      return { ok: true as const, reason: "failed" as const };
    }
    const [app] = await tx.query<Row>("select status from applications where id = $1", [payment.applicationId]);
    const status = String(app?.status ?? "");
    if (status !== "draft" && status !== "payment_pending") {
      await notePaymentReview(
        tx,
        payment.applicationId,
        `Paymob charged transaction ${input.transactionId} for order ${input.paymobOrderId}, but the application is ${status}. It was not marked paid.`,
      );
      return { ok: true as const, reason: "ignored" as const };
    }
    const paidRows = await tx.query(
      `update payments set status = 'paid', transaction_id = $2, paymob_order_id = coalesce($3, paymob_order_id), method = coalesce($4, method), processed_at = now()
       where id = $1 and status = 'pending' returning id`,
      [payment.id, input.transactionId, input.paymobOrderId, input.method],
    );
    if (!paidRows.length) return { ok: true as const, reason: "ignored" as const };
    await tx.query(
      `update applications set status = 'submitted', step = 'done', paid_at = coalesce(paid_at, now()), updated_at = now()
       where id = $1 and status in ('draft', 'payment_pending')`,
      [payment.applicationId],
    );
    await tx.query(
      "insert into application_events (application_id, status, title, description) values ($1, 'submitted', $2, $3)",
      [payment.applicationId, "Payment received", "Your application is submitted and our team is checking your documents"],
    );
    return { ok: true as const, reason: "paid" as const };
  });
}

export async function markRefunded(applicationId: string, paymentId: string) {
  const updated = await sql("update payments set status = 'refunded' where id = $1 and status = 'paid' returning id", [paymentId]);
  if (!updated.length) return { ok: false as const, error: "لا توجد دفعة مكتملة للاسترداد." };
  return setStatus(applicationId, "refunded", {
    title: "Refunded",
    description: "The payment was marked refunded under the refunds policy.",
    onTime: true,
  });
}
