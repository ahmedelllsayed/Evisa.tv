import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteConfig } from "@/config/site.config";
import { serverEnv } from "@/lib/env";
import { sendMail } from "@/lib/email";
import {
  AUDIENCE_CAP,
  cleanAudienceFilter,
  cleanMessage,
  marketingBodies,
  normalizeEmail,
  normalizeSex,
  parseContactImport,
  SAMPLE_LIMIT,
  SEND_BATCH,
  type AudienceFilter,
  type AudiencePerson,
  type AudienceSelection,
  type SexFilter,
} from "@/lib/campaign-mail";
import { getSiteSettings } from "@/lib/data/settings";
import { getDb, iso, num, one, sql } from "./db";

type Row = Record<string, unknown>;

const sexSql: Record<SexFilter, string[]> = {
  male: ["m", "male", "ذكر"],
  female: ["f", "female", "أنثى", "انثى"],
  other: ["other", "آخر"],
};

export type CampaignSummary = {
  id: string;
  subject: string;
  couponCode: string | null;
  status: "sending" | "sent";
  createdAt: string;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
};

export type CampaignRecipient = {
  email: string;
  name: string | null;
  status: "pending" | "sent" | "failed" | "skipped";
  error: string | null;
};

export type StoredContact = {
  id: string;
  email: string;
  name: string | null;
};

function likePattern(query: string) {
  const cleaned = query.trim().replace(/[%_\\]/g, "").slice(0, 80);
  return cleaned ? `%${cleaned}%` : "";
}

function uuidList(ids: string[]) {
  return [...new Set(ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
}

export function unsubscribeToken(email: string) {
  return createHmac("sha256", serverEnv().authSecret).update(normalizeEmail(email)).digest("base64url");
}

export function unsubscribeTokenOk(email: string, token: string) {
  if (!email || !token) return false;
  const expected = unsubscribeToken(email);
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function unsubscribeUrl(email: string) {
  const base = siteConfig.url.replace(/\/$/, "");
  const token = unsubscribeToken(email);
  return `${base}/api/email/unsubscribe?email=${encodeURIComponent(normalizeEmail(email))}&token=${encodeURIComponent(token)}`;
}

export async function listMarketingContacts() {
  const [rows, count] = await Promise.all([
    sql<Row>(
      `select id, email, name from marketing_contacts
       where unsubscribed_at is null
       order by created_at desc
       limit 30`,
    ),
    one<{ n: number }>("select count(*)::int as n from marketing_contacts where unsubscribed_at is null"),
  ]);
  return {
    total: num(count?.n),
    contacts: rows.map((row) => ({ id: String(row.id), email: String(row.email), name: (row.name as string) ?? null })),
  };
}

export async function listAudienceNationalities() {
  const rows = await sql<{ code: string }>(
    `select distinct upper(code) as code from (
       select nationality as code from profiles where nullif(trim(nationality), '') is not null
       union
       select nationality from travelers where nullif(trim(nationality), '') is not null
     ) codes
     where code ~ '^[A-Za-z]{2}$'
     order by 1`,
  );
  return rows.map((row) => row.code);
}

export async function importMarketingContacts(text: string) {
  const parsed = parseContactImport(text);
  if (!parsed.contacts.length && parsed.invalid) return { ok: false as const, error: "لم أجد بريداً صالحاً." };
  if (!parsed.contacts.length) return { ok: false as const, error: "الصق بريداً واحداً على الأقل." };
  if (parsed.contacts.length > AUDIENCE_CAP) return { ok: false as const, error: "الحد 2000 بريداً في كل مرة." };
  const emails = parsed.contacts.map((contact) => contact.email);
  const [accounts, existing] = await Promise.all([
    sql<{ email: string }>("select lower(email) as email from profiles where lower(email) = any($1::text[])", [emails]),
    sql<{ email: string; unsubscribed_at: string | null }>(
      "select email, unsubscribed_at from marketing_contacts where email = any($1::text[])",
      [emails],
    ),
  ]);
  const accountEmails = new Set(accounts.map((row) => row.email));
  const known = new Map(existing.map((row) => [row.email, row.unsubscribed_at]));
  let added = 0;
  let existingAccounts = 0;
  let duplicates = 0;
  let unsubscribed = 0;
  const fresh = parsed.contacts.filter((contact) => {
    if (accountEmails.has(contact.email)) {
      existingAccounts += 1;
      return false;
    }
    if (known.has(contact.email)) {
      if (known.get(contact.email)) unsubscribed += 1;
      else duplicates += 1;
      return false;
    }
    return true;
  });
  if (fresh.length) {
    const db = await getDb();
    await db.transaction(async (tx) => {
      for (const contact of fresh) {
        const rows = await tx.query<{ id: string }>(
          `insert into marketing_contacts (email, name) values ($1, $2)
           on conflict (email) do nothing
           returning id`,
          [contact.email, contact.name],
        );
        if (rows.length) added += 1;
        else duplicates += 1;
      }
    });
  }
  return {
    ok: true as const,
    added,
    existingAccounts,
    duplicates,
    unsubscribed,
    invalid: parsed.invalid,
  };
}

export async function deleteMarketingContact(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false as const, error: "الجهة غير موجودة." };
  const removed = await sql("delete from marketing_contacts where id = $1 returning id", [id]);
  if (!removed.length) return { ok: false as const, error: "الجهة غير موجودة." };
  return { ok: true as const };
}

function applySelection(people: AudiencePerson[], selection: AudienceSelection) {
  const ids = new Set(uuidList(selection.ids));
  if (selection.all) return people.filter((person) => !ids.has(person.id));
  if (!ids.size) return [];
  return people.filter((person) => ids.has(person.id));
}

export async function resolveAudience(input: AudienceFilter, selection: AudienceSelection = { all: true, ids: [] }) {
  const cleaned = cleanAudienceFilter(input);
  if (!cleaned.ok) return cleaned;
  const filter = cleaned.filter;
  const people: AudiencePerson[] = [];
  if (filter.source !== "imported") people.push(...(await customerAudience(filter)));
  if (filter.source !== "customers") people.push(...(await importedAudience(filter.query)));
  const seen = new Set<string>();
  const unique = people.filter((person) => {
    if (seen.has(person.email)) return false;
    seen.add(person.email);
    return true;
  });
  if (unique.length > AUDIENCE_CAP) return { ok: false as const, error: "النتيجة أكبر من 2000 شخص. ضيّق الفلتر." };
  const chosen = applySelection(unique, selection);
  if (!chosen.length) return { ok: false as const, error: selection.all ? "لا يوجد أحد مطابق." : "حدد شخصاً واحداً على الأقل." };
  return { ok: true as const, total: chosen.length, people: chosen };
}

async function customerAudience(filter: AudienceFilter): Promise<AudiencePerson[]> {
  const params: unknown[] = [];
  const where = [
    "coalesce(p.banned, false) = false",
    "p.anonymized_at is null",
    "coalesce(p.marketing_opt_out, false) = false",
    "p.role = 'user'",
  ];
  const pattern = likePattern(filter.query);
  if (pattern) {
    params.push(pattern);
    const slot = `$${params.length}`;
    where.push(
      `(p.email ilike ${slot} or coalesce(p.full_name, '') ilike ${slot} or coalesce(p.first_name, '') ilike ${slot} or coalesce(p.last_name, '') ilike ${slot})`,
    );
  }
  if (filter.visaType) {
    params.push(filter.visaType);
    where.push(`exists (
      select 1 from applications a
      left join visa_options vo on vo.id = a.visa_option_id
      left join destinations d on d.id = a.destination_id
      where a.user_id = p.id and a.paid_at is not null
        and coalesce(nullif(a.visa_details->>'visaType', ''), vo.visa_type, d.visa_type) = $${params.length}
    )`);
  }
  if (filter.destinationId) {
    params.push(filter.destinationId);
    where.push(`exists (
      select 1 from applications a
      where a.user_id = p.id and a.paid_at is not null and a.destination_id = $${params.length}
    )`);
  }
  if (filter.nationality) {
    params.push(filter.nationality);
    where.push(`upper(coalesce(nullif(trim(p.nationality), ''), (
      select t.nationality from travelers t
      join applications a on a.id = t.application_id
      where a.user_id = p.id and nullif(trim(t.nationality), '') is not null
      order by a.created_at desc, t.sort_order
      limit 1
    ), '')) = $${params.length}`);
  }
  if (filter.sex) {
    const values = sexSql[filter.sex];
    const slots = values.map((value) => {
      params.push(value);
      return `$${params.length}`;
    });
    where.push(`lower(coalesce(nullif(trim(p.sex), ''), (
      select t.sex from travelers t
      join applications a on a.id = t.application_id
      where a.user_id = p.id and nullif(trim(t.sex), '') is not null
      order by a.created_at desc, t.sort_order
      limit 1
    ), '')) in (${slots.join(", ")})`);
  }
  if (filter.purchases === "none") where.push("coalesce(paid.purchases, 0) = 0");
  if (filter.purchases === "once") where.push("coalesce(paid.purchases, 0) = 1");
  if (filter.purchases === "repeat") where.push("coalesce(paid.purchases, 0) >= 2");
  if (filter.purchases === "min") {
    params.push(filter.minPurchases);
    where.push(`coalesce(paid.purchases, 0) >= $${params.length}`);
  }
  params.push(AUDIENCE_CAP + 1);
  const rows = await sql<Row>(
    `select p.id,
            lower(p.email) as email,
            coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), nullif(trim(p.full_name), ''), p.email) as name,
            coalesce(nullif(trim(p.sex), ''), traveler.sex) as sex,
            coalesce(paid.purchases, 0)::int as purchases
     from profiles p
     left join lateral (
       select t.sex
       from travelers t
       join applications a on a.id = t.application_id
       where a.user_id = p.id and nullif(trim(t.sex), '') is not null
       order by a.created_at desc, t.sort_order
       limit 1
     ) traveler on true
     left join lateral (
       select count(*)::int as purchases
       from applications a
       where a.user_id = p.id and a.paid_at is not null
     ) paid on true
     where ${where.join(" and ")}
     order by p.created_at desc
     limit $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    kind: "customer" as const,
    sex: normalizeSex(row.sex as string | null),
    purchases: num(row.purchases),
  }));
}

async function importedAudience(query: string): Promise<AudiencePerson[]> {
  const params: unknown[] = [];
  const where = ["c.unsubscribed_at is null", "not exists (select 1 from profiles p where lower(p.email) = c.email)"];
  const pattern = likePattern(query);
  if (pattern) {
    params.push(pattern);
    where.push(`(c.email ilike $${params.length} or coalesce(c.name, '') ilike $${params.length})`);
  }
  params.push(AUDIENCE_CAP + 1);
  const rows = await sql<Row>(
    `select c.id, c.email, c.name
     from marketing_contacts c
     where ${where.join(" and ")}
     order by c.created_at desc
     limit $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    id: String(row.id),
    email: String(row.email),
    name: (row.name as string) || String(row.email),
    kind: "imported" as const,
    sex: null,
    purchases: 0,
  }));
}

export async function previewAudience(input: AudienceFilter) {
  const resolved = await resolveAudience(input);
  if (!resolved.ok) return resolved;
  return {
    ok: true as const,
    total: resolved.total,
    sample: resolved.people.slice(0, SAMPLE_LIMIT),
  };
}

function mailReady() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function createCampaign(input: {
  filter: AudienceFilter;
  selection: AudienceSelection;
  subject: string;
  body: string;
  couponId: string | null;
  actorId: string | null;
}) {
  if (!mailReady()) return { ok: false as const, error: "إرسال البريد غير مضبوط على الخادم." };
  const message = cleanMessage(input.subject, input.body);
  if (!message.ok) return message;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  if (input.couponId) {
    if (!/^[0-9a-f-]{36}$/i.test(input.couponId)) return { ok: false as const, error: "الكوبون غير موجود." };
    const coupon = await one<{ id: string; code: string }>("select id, code from coupons where id = $1", [input.couponId]);
    if (!coupon) return { ok: false as const, error: "الكوبون غير موجود." };
    couponId = coupon.id;
    couponCode = coupon.code;
  }
  const resolved = await resolveAudience(input.filter, input.selection);
  if (!resolved.ok) return resolved;
  const db = await getDb();
  const campaignId = await db.transaction(async (tx) => {
    const [campaign] = await tx.query<{ id: string }>(
      `insert into email_campaigns (subject, body, coupon_id, coupon_code, created_by, status)
       values ($1, $2, $3, $4, $5, 'sending')
       returning id`,
      [message.subject, message.body, couponId, couponCode, input.actorId],
    );
    if (!campaign) throw new Error("campaign was not created");
    for (let index = 0; index < resolved.people.length; index += 100) {
      const chunk = resolved.people.slice(index, index + 100);
      const values: unknown[] = [];
      const rows = chunk.map((person) => {
        const base = values.length;
        values.push(campaign.id, person.email, person.name, person.kind === "customer" ? person.id : null, person.kind === "imported" ? person.id : null);
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`;
      });
      await tx.query(
        `insert into email_recipients (campaign_id, email, name, user_id, contact_id)
         values ${rows.join(",")}`,
        values,
      );
    }
    return campaign.id;
  });
  const progress = await deliverCampaignBatch(campaignId);
  if (!progress.ok) return progress;
  return { ok: true as const, id: campaignId, sent: progress.sent, failed: progress.failed, skipped: progress.skipped, pending: progress.pending };
}

export async function deliverCampaignBatch(id: string, limit = SEND_BATCH) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false as const, error: "الحملة غير موجودة." };
  if (!mailReady()) return { ok: false as const, error: "إرسال البريد غير مضبوط على الخادم." };
  const campaign = await one<Row>("select id, subject, body, coupon_code, status from email_campaigns where id = $1", [id]);
  if (!campaign) return { ok: false as const, error: "الحملة غير موجودة." };
  const settings = await getSiteSettings();
  const office = settings.offices[0];
  const address = office ? `${office.city}، ${office.address}` : null;
  const brand = settings.legalName || settings.name;
  const rows = await sql<Row>(
    `select id, email, name from email_recipients
     where campaign_id = $1 and status = 'pending'
     order by email
     limit $2`,
    [id, limit],
  );
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of rows) {
    const email = String(row.email);
    const suppressed = await one(
      `select 1 as blocked from profiles where lower(email) = $1 and coalesce(marketing_opt_out, false) = true
       union all
       select 1 from marketing_contacts where email = $1 and unsubscribed_at is not null
       limit 1`,
      [email],
    );
    if (suppressed) {
      skipped += 1;
      await sql("update email_recipients set status = 'skipped', error = 'unsubscribed' where id = $1", [row.id]);
      continue;
    }
    const bodies = marketingBodies({
      body: String(campaign.body),
      code: (campaign.coupon_code as string) ?? null,
      brand,
      address,
      unsubscribeUrl: unsubscribeUrl(email),
    });
    const result = await sendMail({
      to: email,
      subject: String(campaign.subject),
      text: bodies.text,
      html: bodies.html,
      idempotencyKey: String(row.id),
    });
    if (result.sent) {
      sent += 1;
      await sql("update email_recipients set status = 'sent', sent_at = now(), error = null where id = $1", [row.id]);
    } else {
      failed += 1;
      await sql("update email_recipients set status = 'failed', error = 'not sent' where id = $1", [row.id]);
    }
  }
  const remaining = await one<{ n: number }>(
    "select count(*)::int as n from email_recipients where campaign_id = $1 and status = 'pending'",
    [id],
  );
  const pending = num(remaining?.n);
  if (pending === 0) {
    await sql("update email_campaigns set status = 'sent', updated_at = now() where id = $1", [id]);
  } else {
    await sql("update email_campaigns set updated_at = now() where id = $1", [id]);
  }
  return { ok: true as const, sent, failed, skipped, pending };
}

export async function listCampaigns(): Promise<CampaignSummary[]> {
  const rows = await sql<Row>(
    `select c.id, c.subject, c.coupon_code, c.status, c.created_at,
            count(r.id) filter (where r.status = 'sent')::int as sent,
            count(r.id) filter (where r.status = 'failed')::int as failed,
            count(r.id) filter (where r.status = 'skipped')::int as skipped,
            count(r.id) filter (where r.status = 'pending')::int as pending
     from email_campaigns c
     left join email_recipients r on r.campaign_id = c.id
     group by c.id
     order by c.created_at desc
     limit 30`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    subject: String(row.subject),
    couponCode: (row.coupon_code as string) ?? null,
    status: row.status === "sent" ? "sent" : "sending",
    createdAt: iso(row.created_at),
    sent: num(row.sent),
    failed: num(row.failed),
    skipped: num(row.skipped),
    pending: num(row.pending),
  }));
}

export async function getCampaign(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [summary] = (await sql<Row>(
    `select c.id, c.subject, c.body, c.coupon_code, c.status, c.created_at,
            count(r.id) filter (where r.status = 'sent')::int as sent,
            count(r.id) filter (where r.status = 'failed')::int as failed,
            count(r.id) filter (where r.status = 'skipped')::int as skipped,
            count(r.id) filter (where r.status = 'pending')::int as pending
     from email_campaigns c
     left join email_recipients r on r.campaign_id = c.id
     where c.id = $1
     group by c.id`,
    [id],
  )).map((row) => ({
    id: String(row.id),
    subject: String(row.subject),
    body: String(row.body),
    couponCode: (row.coupon_code as string) ?? null,
    status: (row.status === "sent" ? "sent" : "sending") as "sent" | "sending",
    createdAt: iso(row.created_at),
    sent: num(row.sent),
    failed: num(row.failed),
    skipped: num(row.skipped),
    pending: num(row.pending),
  }));
  if (!summary) return null;
  const recipients = await sql<Row>(
    `select email, name, status, error from email_recipients
     where campaign_id = $1
     order by case status when 'failed' then 0 when 'pending' then 1 when 'skipped' then 2 else 3 end, email
     limit 200`,
    [id],
  );
  return {
    ...summary,
    recipients: recipients.map((row) => ({
      email: String(row.email),
      name: (row.name as string) ?? null,
      status: String(row.status) as CampaignRecipient["status"],
      error: (row.error as string) ?? null,
    })),
  };
}

export async function suppressMarketingEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  await sql("update profiles set marketing_opt_out = true where lower(email) = $1", [normalized]);
  await sql("update marketing_contacts set unsubscribed_at = coalesce(unsubscribed_at, now()) where email = $1", [normalized]);
  await sql(
    "update email_recipients set status = 'skipped', error = 'unsubscribed' where lower(email) = $1 and status = 'pending'",
    [normalized],
  );
}
