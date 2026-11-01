import "server-only";
import { iso, one, sql } from "@/lib/data/db";

export type RefundRequest = {
  id: string;
  applicationId: string;
  userId: string;
  reason: string;
  status: "open" | "approved" | "declined";
  createdAt: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  topic: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
};

function toRefund(row: Record<string, unknown>): RefundRequest {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    userId: String(row.user_id),
    reason: String(row.reason),
    status: row.status as RefundRequest["status"],
    createdAt: iso(row.created_at),
  };
}

export async function getRefundRequest(applicationId: string) {
  const row = await one("select * from refund_requests where application_id = $1", [applicationId]);
  return row ? toRefund(row) : null;
}

export async function listRefundsForUser(userId: string) {
  const rows = await sql("select * from refund_requests where user_id = $1 order by created_at desc", [userId]);
  return rows.map(toRefund);
}

export async function createRefundRequest(input: { applicationId: string; userId: string; reason: string }) {
  const existing = await getRefundRequest(input.applicationId);
  if (existing) return existing;
  const row = await one(
    `insert into refund_requests (application_id, user_id, reason)
     values ($1,$2,$3)
     on conflict (application_id) do nothing
     returning *`,
    [input.applicationId, input.userId, input.reason.trim()],
  );
  return row ? toRefund(row) : getRefundRequest(input.applicationId);
}

export async function setRefundRequestStatus(applicationId: string, status: RefundRequest["status"]) {
  await sql("update refund_requests set status = $2 where application_id = $1 and status = 'open'", [applicationId, status]);
}

export async function createContactMessage(input: { name: string; email: string; topic: string; body: string }) {
  await sql("insert into contact_messages (name, email, topic, body) values ($1,$2,$3,$4)", [
    input.name.trim(),
    input.email.trim().toLowerCase(),
    input.topic.trim() || null,
    input.body.trim(),
  ]);
}

export async function listContactMessages(query = ""): Promise<ContactMessage[]> {
  const term = `%${query.trim().toLowerCase()}%`;
  const rows = await sql(
    `select * from contact_messages
     where $1 = '%%' or lower(name) like $1 or lower(email) like $1 or lower(coalesce(topic, '')) like $1 or lower(body) like $1
     order by created_at desc limit 200`,
    [term],
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    topic: (row.topic as string) ?? null,
    body: String(row.body),
    createdAt: iso(row.created_at),
    readAt: row.read_at ? iso(row.read_at) : null,
  }));
}

export async function setMessageRead(id: string, read: boolean) {
  await sql(`update contact_messages set read_at = ${read ? "now()" : "null"} where id = $1`, [id]);
}

export async function deleteContactMessage(id: string) {
  await sql("delete from contact_messages where id = $1", [id]);
}
