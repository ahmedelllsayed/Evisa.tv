import "server-only";
import { cleanAudienceFilter, emptyFilter, parseContactImport, type AudienceFilter, type Channel } from "@/lib/marketing/audience";
import { cleanContent, contentProblem, type MessageContent } from "@/lib/marketing/render";
import { whatsappSendMode } from "./settings";
import { getDb, iso, json, num, one, sql } from "../db";

type Row = Record<string, unknown>;
const uuidPattern = /^[0-9a-f-]{36}$/i;

export type Segment = { id: string; name: string; filter: AudienceFilter; updatedAt: string; campaigns: number; coupons: number };

function toFilter(value: unknown) {
  const cleaned = cleanAudienceFilter(json<Partial<AudienceFilter>>(value, {}));
  return cleaned.ok ? cleaned.filter : emptyFilter;
}

export async function listSegments(): Promise<Segment[]> {
  const rows = await sql(
    `select s.*, (select count(*)::int from marketing_campaigns c where c.segment_id = s.id) as campaigns,
            (select count(*)::int from coupons c where c.segment_id = s.id) as coupons
     from marketing_segments s order by s.updated_at desc`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    filter: toFilter(row.filter),
    updatedAt: iso(row.updated_at),
    campaigns: num(row.campaigns),
    coupons: num(row.coupons),
  }));
}

export async function getSegment(id: string) {
  if (!uuidPattern.test(id)) return null;
  const row = await one("select * from marketing_segments where id = $1", [id]);
  return row ? { id: String(row.id), name: String(row.name), filter: toFilter(row.filter) } : null;
}

export async function saveSegment(input: { id?: string | null; name: string; filter: Partial<AudienceFilter> }) {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false as const, error: "اكتب اسماً للشريحة." };
  const cleaned = cleanAudienceFilter(input.filter);
  if (!cleaned.ok) return cleaned;
  if (input.id) {
    const row = await one<{ id: string }>("update marketing_segments set name = $2, filter = $3::jsonb, updated_at = now() where id = $1 returning id", [
      input.id,
      name,
      JSON.stringify(cleaned.filter),
    ]);
    return row ? { ok: true as const, id: row.id } : { ok: false as const, error: "الشريحة غير موجودة." };
  }
  const row = await one<{ id: string }>("insert into marketing_segments (name, filter) values ($1, $2::jsonb) returning id", [name, JSON.stringify(cleaned.filter)]);
  return { ok: true as const, id: row!.id };
}

export async function deleteSegment(id: string) {
  const removed = await sql("delete from marketing_segments where id = $1 returning id", [id]);
  return removed.length ? { ok: true as const } : { ok: false as const, error: "الشريحة غير موجودة." };
}

export type ContactList = { id: string; name: string; contacts: number; emails: number; phones: number };
export type StoredContact = { id: string; email: string | null; phone: string | null; name: string | null; unsubscribed: boolean };

export async function listContactLists(): Promise<ContactList[]> {
  const rows = await sql(
    `select l.id, l.name,
            count(c.id) filter (where c.unsubscribed_at is null)::int as contacts,
            count(c.email) filter (where c.unsubscribed_at is null)::int as emails,
            count(c.phone) filter (where c.unsubscribed_at is null)::int as phones
     from marketing_lists l
     left join marketing_list_members m on m.list_id = l.id
     left join marketing_contacts c on c.id = m.contact_id
     group by l.id order by l.created_at`,
  );
  return rows.map((row) => ({ id: String(row.id), name: String(row.name), contacts: num(row.contacts), emails: num(row.emails), phones: num(row.phones) }));
}

export async function listContacts(listId: string, limit = 100): Promise<StoredContact[]> {
  if (!uuidPattern.test(listId)) return [];
  const rows = await sql(
    `select c.id, c.email, c.phone, c.name, c.unsubscribed_at from marketing_contacts c
     join marketing_list_members m on m.contact_id = c.id and m.list_id = $1
     order by c.created_at desc limit $2`,
    [listId, limit],
  );
  return rows.map((row) => ({
    id: String(row.id),
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    name: (row.name as string) ?? null,
    unsubscribed: Boolean(row.unsubscribed_at),
  }));
}

export async function saveContactList(input: { id?: string | null; name: string }) {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false as const, error: "اكتب اسماً للقائمة." };
  try {
    if (input.id) {
      const row = await one<{ id: string }>("update marketing_lists set name = $2 where id = $1 returning id", [input.id, name]);
      return row ? { ok: true as const, id: row.id } : { ok: false as const, error: "القائمة غير موجودة." };
    }
    const row = await one<{ id: string }>("insert into marketing_lists (name) values ($1) returning id", [name]);
    return { ok: true as const, id: row!.id };
  } catch (error) {
    if (String(error).includes("unique") || String(error).includes("23505")) return { ok: false as const, error: "يوجد قائمة بهذا الاسم." };
    throw error;
  }
}

/** Deletes the list. Contacts that belong to no other list are deleted with it. */
export async function deleteContactList(id: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const members = await tx.query<{ contact_id: string }>("select contact_id from marketing_list_members where list_id = $1", [id]);
    const removed = await tx.query("delete from marketing_lists where id = $1 returning id", [id]);
    if (!removed.length) return { ok: false as const, error: "القائمة غير موجودة." };
    if (members.length) {
      await tx.query(
        `delete from marketing_contacts c where c.id = any($1::uuid[])
           and not exists (select 1 from marketing_list_members m where m.contact_id = c.id)`,
        [members.map((member) => member.contact_id)],
      );
    }
    return { ok: true as const };
  });
}

export async function importContacts(listId: string, text: string) {
  if (!uuidPattern.test(listId)) return { ok: false as const, error: "اختر قائمة." };
  const parsed = parseContactImport(text);
  if (!parsed.contacts.length) return { ok: false as const, error: parsed.invalid ? "لم أجد بريداً أو هاتفاً صالحاً." : "الصق جهة واحدة على الأقل." };
  if (parsed.contacts.length > 5000) return { ok: false as const, error: "الحد 5000 جهة في كل مرة." };
  const emails = parsed.contacts.flatMap((contact) => (contact.email ? [contact.email] : []));
  const accounts = new Set(
    (await sql<{ email: string }>("select lower(email) as email from profiles where lower(email) = any($1::text[])", [emails])).map((row) => row.email),
  );
  let added = 0;
  let linked = 0;
  let existingAccounts = 0;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [list] = await tx.query("select id from marketing_lists where id = $1", [listId]);
    if (!list) throw new Error("list missing");
    for (const contact of parsed.contacts) {
      if (contact.email && accounts.has(contact.email) && !contact.phone) {
        existingAccounts += 1;
        continue;
      }
      const [found] = await tx.query<Row>(
        `select id, email, phone from marketing_contacts
         where ($1::text is not null and email = $1) or ($2::text is not null and phone = $2)
         limit 1`,
        [contact.email, contact.phone],
      );
      let id = found ? String(found.id) : null;
      if (found) {
        await tx.query(
          `update marketing_contacts set email = coalesce(email, $2), phone = coalesce(phone, $3), name = coalesce(name, $4)
           where id = $1
             and ($2::text is null or email is not null or not exists (select 1 from marketing_contacts o where o.email = $2))
             and ($3::text is null or phone is not null or not exists (select 1 from marketing_contacts o where o.phone = $3))`,
          [id, contact.email, contact.phone, contact.name],
        );
      } else {
        const [row] = await tx.query<{ id: string }>(
          "insert into marketing_contacts (email, phone, name) values ($1, $2, $3) returning id",
          [contact.email, contact.phone, contact.name],
        );
        id = row?.id ?? null;
        if (id) added += 1;
      }
      if (!id) continue;
      const member = await tx.query("insert into marketing_list_members (list_id, contact_id) values ($1, $2) on conflict do nothing returning list_id", [listId, id]);
      if (found && member.length) linked += 1;
    }
  });
  return { ok: true as const, added, linked, existingAccounts, invalid: parsed.invalid };
}

export async function removeContact(listId: string, contactId: string) {
  await sql("delete from marketing_list_members where list_id = $1 and contact_id = $2", [listId, contactId]);
  await sql("delete from marketing_contacts c where c.id = $1 and not exists (select 1 from marketing_list_members m where m.contact_id = c.id)", [contactId]);
  return { ok: true as const };
}

export type Suppression = { channel: Channel; address: string; reason: string | null; createdAt: string };

export async function listSuppressions(limit = 50): Promise<{ total: number; rows: Suppression[] }> {
  const [rows, count] = await Promise.all([
    sql("select channel, address, reason, created_at from marketing_suppressions order by created_at desc limit $1", [limit]),
    one<{ n: number }>("select count(*)::int as n from marketing_suppressions"),
  ]);
  return {
    total: num(count?.n),
    rows: rows.map((row) => ({ channel: row.channel as Channel, address: String(row.address), reason: (row.reason as string) ?? null, createdAt: iso(row.created_at) })),
  };
}

export type Template = { id: string; name: string; channel: Channel; content: MessageContent; updatedAt: string };

function toTemplate(row: Row): Template {
  return {
    id: String(row.id),
    name: String(row.name),
    channel: row.channel as Channel,
    content: cleanContent({
      subject: row.subject as string | null,
      subjectEn: row.subject_en as string | null,
      body: String(row.body ?? ""),
      bodyEn: row.body_en as string | null,
      waName: row.wa_name as string | null,
      waLanguage: row.wa_language as string | null,
      waParams: json<string[]>(row.wa_params, []),
    }),
    updatedAt: iso(row.updated_at),
  };
}

export async function listTemplates(): Promise<Template[]> {
  return (await sql("select * from marketing_templates order by channel, updated_at desc")).map(toTemplate);
}

export async function getTemplate(id: string | null) {
  if (!id || !uuidPattern.test(id)) return null;
  const row = await one("select * from marketing_templates where id = $1", [id]);
  return row ? toTemplate(row) : null;
}

export async function saveTemplate(input: { id?: string | null; name: string; channel: Channel; content: Partial<MessageContent> }) {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false as const, error: "اكتب اسماً للقالب." };
  if (!["email", "sms", "whatsapp"].includes(input.channel)) return { ok: false as const, error: "اختر القناة." };
  const content = cleanContent(input.content);
  const mode = input.channel === "whatsapp" ? await whatsappSendMode() : "cloud";
  const problem = contentProblem(input.channel, content, mode);
  if (problem) return { ok: false as const, error: problem };
  const params = [name, input.channel, content.subject, content.subjectEn, content.body, content.bodyEn, content.waName, content.waLanguage, JSON.stringify(content.waParams)];
  if (input.id) {
    const row = await one<{ id: string }>(
      `update marketing_templates set name=$2, channel=$3, subject=$4, subject_en=$5, body=$6, body_en=$7, wa_name=$8, wa_language=$9,
         wa_params=$10::jsonb, updated_at=now() where id=$1 returning id`,
      [input.id, ...params],
    );
    return row ? { ok: true as const, id: row.id } : { ok: false as const, error: "القالب غير موجود." };
  }
  const row = await one<{ id: string }>(
    `insert into marketing_templates (name, channel, subject, subject_en, body, body_en, wa_name, wa_language, wa_params)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) returning id`,
    params,
  );
  return { ok: true as const, id: row!.id };
}

export async function deleteTemplate(id: string) {
  const removed = await sql("delete from marketing_templates where id = $1 returning id", [id]);
  return removed.length ? { ok: true as const } : { ok: false as const, error: "القالب غير موجود." };
}
