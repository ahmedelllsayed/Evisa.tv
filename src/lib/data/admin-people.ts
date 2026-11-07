import "server-only";
import { parseAdminRole } from "@/lib/rbac-constants";
import type { AdminRole } from "@/lib/types";
import { iso, isoOrNull, num, one, sql } from "./db";

const OPEN_STATUSES = "('submitted', 'in_review', 'filed')";

export type MessageReply = { id: string; messageId: string; authorEmail: string | null; body: string; createdAt: string };

export async function listMessageReplies(messageIds: string[]): Promise<Record<string, MessageReply[]>> {
  if (!messageIds.length) return {};
  const rows = await sql(
    "select id, message_id, author_email, body, created_at from message_replies where message_id = any($1::uuid[]) order by created_at asc",
    [messageIds],
  );
  const grouped: Record<string, MessageReply[]> = {};
  for (const row of rows) {
    const reply = {
      id: String(row.id),
      messageId: String(row.message_id),
      authorEmail: row.author_email ? String(row.author_email) : null,
      body: String(row.body),
      createdAt: iso(row.created_at),
    };
    (grouped[reply.messageId] ??= []).push(reply);
  }
  return grouped;
}

export type SenderMatch = { userId: string; fullName: string | null; applications: number; banned: boolean };

export async function matchMessageSenders(emails: string[]): Promise<Record<string, SenderMatch>> {
  const unique = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return {};
  const rows = await sql(
    `select p.id, lower(p.email) as email, p.full_name, p.banned,
            (select count(*)::int from applications a where a.user_id = p.id) as applications
     from profiles p where lower(p.email) = any($1::text[]) and p.anonymized_at is null`,
    [unique],
  );
  const matches: Record<string, SenderMatch> = {};
  for (const row of rows) {
    matches[String(row.email)] = {
      userId: String(row.id),
      fullName: row.full_name ? String(row.full_name) : null,
      applications: num(row.applications),
      banned: Boolean(row.banned),
    };
  }
  return matches;
}

export type StaffLoad = { open: number; late: number; hiredAt: string | null };

export async function listStaffLoad(): Promise<Record<string, StaffLoad>> {
  const rows = await sql(
    `select p.id, s.hired_at::text as hired_at,
            count(a.id) filter (where a.status in ${OPEN_STATUSES})::int as open,
            count(a.id) filter (where a.status in ${OPEN_STATUSES} and a.guaranteed_at < now())::int as late
     from profiles p
     left join staff_profiles s on s.user_id = p.id
     left join applications a on a.assignee_id = p.id
     where p.role <> 'user'
     group by p.id, s.hired_at`,
  );
  const load: Record<string, StaffLoad> = {};
  for (const row of rows) {
    load[String(row.id)] = { open: num(row.open), late: num(row.late), hiredAt: row.hired_at ? String(row.hired_at).slice(0, 10) : null };
  }
  return load;
}

export async function openFileTotals() {
  const row = await one(
    `select count(*) filter (where status in ${OPEN_STATUSES})::int as open,
            count(*) filter (where status in ${OPEN_STATUSES} and assignee_id is null)::int as unassigned,
            count(*) filter (where status in ${OPEN_STATUSES} and guaranteed_at < now())::int as late
     from applications`,
  );
  return { open: num(row?.open), unassigned: num(row?.unassigned), late: num(row?.late) };
}

export async function listPromotableEmails(): Promise<string[]> {
  const rows = await sql(
    "select email from profiles where role = 'user' and not banned and anonymized_at is null order by created_at desc limit 300",
  );
  return rows.map((row) => String(row.email));
}

export type UserFlags = { paidPayments: number; anonymized: boolean };

export async function listUserFlags(): Promise<Record<string, UserFlags>> {
  const rows = await sql(
    `select p.id, p.anonymized_at is not null as anonymized,
            (select count(*)::int from payments pay join applications a on a.id = pay.application_id
             where a.user_id = p.id and pay.status in ('paid', 'refunded')) as paid
     from profiles p`,
  );
  const flags: Record<string, UserFlags> = {};
  for (const row of rows) flags[String(row.id)] = { paidPayments: num(row.paid), anonymized: Boolean(row.anonymized) };
  return flags;
}

export type UserProfileDetail = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: AdminRole;
  staffNotes: string | null;
  createdAt: string;
  banned: boolean;
  anonymizedAt: string | null;
  locale: string | null;
  totpEnabled: boolean;
};

export async function getUserProfileDetail(id: string): Promise<UserProfileDetail | null> {
  const row = await one(
    "select id, email, full_name, phone, role, staff_notes, created_at, banned, anonymized_at, locale, totp_enabled from profiles where id = $1",
    [id],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: row.full_name ? String(row.full_name) : null,
    phone: row.phone ? String(row.phone) : null,
    role: parseAdminRole(row.role),
    staffNotes: row.staff_notes ? String(row.staff_notes) : null,
    createdAt: iso(row.created_at),
    banned: Boolean(row.banned),
    anonymizedAt: isoOrNull(row.anonymized_at),
    locale: row.locale ? String(row.locale) : null,
    totpEnabled: Boolean(row.totp_enabled),
  };
}

export type UserPayment = {
  id: string;
  applicationId: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
};

export async function listUserPayments(userId: string): Promise<UserPayment[]> {
  const rows = await sql(
    `select p.id, p.application_id, p.amount, p.currency, p.status, p.provider, a.reference, p.created_at
     from payments p join applications a on a.id = p.application_id
     where a.user_id = $1 order by p.created_at desc limit 30`,
    [userId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    applicationId: String(row.application_id),
    reference: String(row.reference),
    amount: num(row.amount),
    currency: String(row.currency ?? "EGP"),
    status: String(row.status),
    provider: String(row.provider ?? ""),
    createdAt: iso(row.created_at),
  }));
}

export type UserMessage = { id: string; topic: string | null; body: string; createdAt: string; readAt: string | null };

export async function listMessagesFromEmail(email: string): Promise<UserMessage[]> {
  const rows = await sql(
    `select id, topic, body, created_at, read_at from contact_messages
     where deleted_at is null and lower(email) = lower($1) order by created_at desc limit 10`,
    [email],
  );
  return rows.map((row) => ({
    id: String(row.id),
    topic: row.topic ? String(row.topic) : null,
    body: String(row.body),
    createdAt: iso(row.created_at),
    readAt: isoOrNull(row.read_at),
  }));
}

export type AuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
};

function toAudit(row: Record<string, unknown>): AuditEntry {
  return {
    id: String(row.id),
    actorEmail: row.actor_email ? String(row.actor_email) : null,
    action: String(row.action),
    target: row.target ? String(row.target) : null,
    detail: row.detail ? String(row.detail) : null,
    createdAt: iso(row.created_at),
    ip: row.ip ? String(row.ip) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
  };
}

export async function listAuditForTargets(targets: string[], limit = 20): Promise<AuditEntry[]> {
  const rows = await sql(
    "select id, actor_email, action, target, detail, created_at, ip, user_agent from admin_audit where target = any($1::text[]) order by created_at desc limit $2",
    [targets, limit],
  );
  return rows.map(toAudit);
}

export type AuditFilter = { actor?: string; action?: string; from?: string; to?: string };

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function auditWhere(filter: AuditFilter, includeAction = true) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.actor) {
    params.push(`%${escapeLike(filter.actor.trim().toLowerCase())}%`);
    clauses.push(`lower(coalesce(actor_email, '')) like $${params.length}`);
  }
  if (includeAction && filter.action) {
    params.push(filter.action, `${escapeLike(filter.action)}.%`);
    clauses.push(`(action = $${params.length - 1} or action like $${params.length})`);
  }
  if (filter.from) {
    params.push(filter.from);
    clauses.push(`created_at >= $${params.length}::timestamptz`);
  }
  if (filter.to) {
    params.push(filter.to);
    clauses.push(`created_at < $${params.length}::timestamptz`);
  }
  return { where: clauses.length ? `where ${clauses.join(" and ")}` : "", params };
}

export async function listAudit(filter: AuditFilter, page: number, perPage: number) {
  const { where, params } = auditWhere(filter);
  const [rows, total] = await Promise.all([
    sql(
      `select id, actor_email, action, target, detail, created_at, ip, user_agent from admin_audit ${where}
       order by created_at desc limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, perPage, (page - 1) * perPage],
    ),
    one(`select count(*)::int as n from admin_audit ${where}`, params),
  ]);
  return { rows: rows.map(toAudit), total: num(total?.n) };
}

export async function auditFacets(filter: AuditFilter) {
  const scoped = auditWhere(filter, false);
  const [groups, actors] = await Promise.all([
    sql(`select split_part(action, '.', 1) as prefix, count(*)::int as n from admin_audit ${scoped.where} group by 1 order by 2 desc`, scoped.params),
    sql("select actor_email, count(*)::int as n from admin_audit where actor_email is not null group by 1 order by 2 desc limit 50"),
  ]);
  return {
    groups: groups.map((row) => ({ prefix: String(row.prefix), count: num(row.n) })),
    actors: actors.map((row) => ({ email: String(row.actor_email), count: num(row.n) })),
  };
}
