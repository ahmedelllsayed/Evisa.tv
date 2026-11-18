import "server-only";
import type { Db } from "@/lib/db/core";
import { marketWallTime } from "@/lib/coupon-math";
import { cleanAudienceFilter, emptyFilter, type AudienceFilter, type Channel } from "@/lib/marketing/audience";
import { cleanContent, contentProblem, type MessageContent } from "@/lib/marketing/render";
import { generateCouponCodes } from "../coupons";
import { getDb, iso, isoOrNull, json, num, one, sql } from "../db";
import { resolveAudience, type ReachablePerson } from "./audience";
import { deliverMessages, newToken } from "./queue";
import { emailReady, getSmsChannel, getWhatsAppChannel, whatsappSendMode } from "./settings";

type Row = Record<string, unknown>;
type Queryable = Pick<Db, "query">;
const uuidPattern = /^[0-9a-f-]{36}$/i;

export type CampaignStatus = "draft" | "scheduled" | "sending" | "paused" | "sent" | "cancelled";

export type CampaignInput = {
  id?: string | null;
  name: string;
  channel: Channel;
  segmentId: string | null;
  filter: Partial<AudienceFilter>;
  excluded: string[];
  templateId: string | null;
  content: Partial<MessageContent>;
  couponId: string | null;
  uniqueCodes: boolean;
  linkUrl: string | null;
};

export type Campaign = {
  id: string;
  name: string;
  channel: Channel;
  segmentId: string | null;
  segmentName: string | null;
  filter: AudienceFilter;
  excluded: string[];
  templateId: string | null;
  content: MessageContent;
  couponId: string | null;
  couponCode: string | null;
  uniqueCodes: boolean;
  linkUrl: string | null;
  status: CampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  clicks: number;
  clickers: number;
};

const CAMPAIGN_SELECT = `
  select c.*, s.name as segment_name, cp.code as coupon_parent_code,
         count(m.id)::int as total,
         count(m.id) filter (where m.status = 'sent')::int as sent,
         count(m.id) filter (where m.status = 'failed')::int as failed,
         count(m.id) filter (where m.status = 'skipped')::int as skipped,
         count(m.id) filter (where m.status = 'pending')::int as pending,
         coalesce(sum(m.clicks), 0)::int as clicks,
         count(m.id) filter (where m.clicks > 0)::int as clickers
  from marketing_campaigns c
  left join marketing_segments s on s.id = c.segment_id
  left join coupons cp on cp.id = c.coupon_id
  left join marketing_messages m on m.campaign_id = c.id`;

function toCampaign(row: Row): Campaign {
  const audience = json<{ filter?: Partial<AudienceFilter>; excluded?: string[] }>(row.audience, {});
  const cleaned = cleanAudienceFilter(audience.filter ?? {});
  return {
    id: String(row.id),
    name: String(row.name),
    channel: row.channel as Channel,
    segmentId: (row.segment_id as string) ?? null,
    segmentName: (row.segment_name as string) ?? null,
    filter: cleaned.ok ? cleaned.filter : emptyFilter,
    excluded: Array.isArray(audience.excluded) ? audience.excluded.map(String) : [],
    templateId: (row.template_id as string) ?? null,
    content: cleanContent(json<Partial<MessageContent>>(row.content, {})),
    couponId: (row.coupon_id as string) ?? null,
    couponCode: (row.coupon_code as string) ?? (row.coupon_parent_code as string) ?? null,
    uniqueCodes: Boolean(row.unique_codes),
    linkUrl: (row.link_url as string) ?? null,
    status: row.status as CampaignStatus,
    scheduledAt: isoOrNull(row.scheduled_at),
    startedAt: isoOrNull(row.started_at),
    finishedAt: isoOrNull(row.finished_at),
    createdAt: iso(row.created_at),
    total: num(row.total),
    sent: num(row.sent),
    failed: num(row.failed),
    skipped: num(row.skipped),
    pending: num(row.pending),
    clicks: num(row.clicks),
    clickers: num(row.clickers),
  };
}

export async function listCampaigns(limit = 100) {
  const rows = await sql(`${CAMPAIGN_SELECT} group by c.id, s.name, cp.code order by c.created_at desc limit $1`, [limit]);
  return rows.map(toCampaign);
}

export async function getCampaign(id: string) {
  if (!uuidPattern.test(id)) return null;
  const row = await one(`${CAMPAIGN_SELECT} where c.id = $1 group by c.id, s.name, cp.code`, [id]);
  return row ? toCampaign(row) : null;
}

function cleanLink(value: string | null) {
  const link = (value ?? "").trim();
  if (!link) return { ok: true as const, link: null };
  if (link.startsWith("/") && !link.startsWith("//")) return { ok: true as const, link: link.slice(0, 500) };
  try {
    const url = new URL(link);
    if (url.protocol === "https:" || url.protocol === "http:") return { ok: true as const, link: url.toString().slice(0, 500) };
  } catch {
    return { ok: false as const, error: "الرابط يبدأ بـ https:// أو بـ / لصفحة في الموقع." };
  }
  return { ok: false as const, error: "الرابط يبدأ بـ https:// أو بـ / لصفحة في الموقع." };
}

export async function saveCampaignDraft(input: CampaignInput, actorId: string | null) {
  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) return { ok: false as const, error: "اكتب اسماً للحملة." };
  if (!["email", "sms", "whatsapp"].includes(input.channel)) return { ok: false as const, error: "اختر القناة." };
  const filter = cleanAudienceFilter(input.filter);
  if (!filter.ok) return filter;
  const link = cleanLink(input.linkUrl);
  if (!link.ok) return link;
  const segmentId = input.segmentId && uuidPattern.test(input.segmentId) ? input.segmentId : null;
  const templateId = input.templateId && uuidPattern.test(input.templateId) ? input.templateId : null;
  const couponId = input.couponId && uuidPattern.test(input.couponId) ? input.couponId : null;
  const coupon = couponId ? await one<{ code: string }>("select code from coupons where id = $1", [couponId]) : null;
  if (couponId && !coupon) return { ok: false as const, error: "الكوبون غير موجود." };
  const audience = JSON.stringify({ filter: filter.filter, excluded: [...new Set(input.excluded.filter((id) => uuidPattern.test(id)))].slice(0, 2000) });
  const content = JSON.stringify(cleanContent(input.content));
  const params = [name, input.channel, segmentId, audience, templateId, content, couponId, coupon?.code ?? null, Boolean(couponId && input.uniqueCodes), link.link];
  if (input.id) {
    const row = await one<{ id: string }>(
      `update marketing_campaigns set name=$2, channel=$3, segment_id=$4, audience=$5::jsonb, template_id=$6, content=$7::jsonb,
         coupon_id=$8, coupon_code=$9, unique_codes=$10, link_url=$11, updated_at=now()
       where id=$1 and status in ('draft', 'scheduled') returning id`,
      [input.id, ...params],
    );
    return row ? { ok: true as const, id: row.id } : { ok: false as const, error: "لا تُعدَّل حملة بدأ إرسالها." };
  }
  const row = await one<{ id: string }>(
    `insert into marketing_campaigns (name, channel, segment_id, audience, template_id, content, coupon_id, coupon_code, unique_codes, link_url, created_by)
     values ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10,$11) returning id`,
    [...params, actorId],
  );
  return { ok: true as const, id: row!.id };
}

export async function channelProblem(channel: Channel) {
  if (channel === "email") return emailReady() ? null : "إرسال البريد غير مضبوط على الخادم.";
  if (channel === "sms") {
    const sms = await getSmsChannel();
    return sms.enabled && sms.config.url ? null : "قناة الرسائل النصية غير مفعّلة. اضبطها من صفحة القنوات.";
  }
  const whatsapp = await getWhatsAppChannel();
  if (!whatsapp.enabled) return "قناة واتساب غير مفعّلة. اضبطها من صفحة القنوات.";
  if (whatsapp.config.provider === "waha") {
    return whatsapp.config.url && whatsapp.config.session && whatsapp.hasSecret ? null : "إعداد WAHA غير مكتمل. اكتب العنوان والجلسة والمفتاح.";
  }
  return whatsapp.config.phoneNumberId && whatsapp.hasSecret ? null : "إعداد واتساب كلاود غير مكتمل. اكتب رقم الهاتف ورمز الدخول.";
}

async function audienceFor(campaign: Campaign, q?: Queryable) {
  let filter: Partial<AudienceFilter> = campaign.filter;
  if (campaign.segmentId) {
    const segment = await (q ?? (await getDb())).query<{ filter: unknown }>("select filter from marketing_segments where id = $1", [campaign.segmentId]);
    if (!segment[0]) return { ok: false as const, error: "الشريحة المختارة حُذفت." };
    filter = json<Partial<AudienceFilter>>(segment[0].filter, {});
  }
  return resolveAudience(filter, { channel: campaign.channel, excluded: campaign.excluded, q });
}

export async function previewCampaignAudience(input: { channel: Channel; segmentId: string | null; filter: Partial<AudienceFilter> }) {
  let filter = input.filter;
  if (input.segmentId) {
    const segment = await one<{ filter: unknown }>("select filter from marketing_segments where id = $1", [input.segmentId]);
    if (!segment) return { ok: false as const, error: "الشريحة غير موجودة." };
    filter = json<Partial<AudienceFilter>>(segment.filter, {});
  }
  const resolved = await resolveAudience(filter, { channel: input.channel });
  if (!resolved.ok) return resolved;
  return { ok: true as const, total: resolved.people.length, unreachable: resolved.unreachable, suppressed: resolved.suppressed, sample: resolved.people.slice(0, 40) };
}

async function readyProblem(campaign: Campaign) {
  const mode = campaign.channel === "whatsapp" ? await whatsappSendMode() : "cloud";
  return contentProblem(campaign.channel, campaign.content, mode);
}

async function insertRecipients(tx: Queryable, campaign: Campaign, people: ReachablePerson[]) {
  for (let index = 0; index < people.length; index += 100) {
    const chunk = people.slice(index, index + 100);
    const values: unknown[] = [];
    const rows = chunk.map((person) => {
      const base = values.length;
      values.push(newToken(), campaign.id, campaign.channel, person.kind === "customer" ? person.id : null, person.kind === "imported" ? person.id : null, person.address, person.name, person.locale, campaign.couponCode);
      return `(${Array.from({ length: 9 }, (_, offset) => `$${base + offset + 1}`).join(",")})`;
    });
    await tx.query(
      `insert into marketing_messages (token, campaign_id, channel, user_id, contact_id, address, name, locale, coupon_code)
       values ${rows.join(",")} on conflict do nothing`,
      values,
    );
  }
  if (campaign.couponId && campaign.uniqueCodes) {
    const messages = await tx.query<{ id: string; user_id: string | null; address: string }>(
      "select id, user_id, address from marketing_messages where campaign_id = $1 and status = 'pending'",
      [campaign.id],
    );
    for (const message of messages) {
      const [code] = await generateCouponCodes(tx, campaign.couponId, 1, {
        prefix: campaign.couponCode?.slice(0, 8) ?? null,
        userId: message.user_id,
        email: campaign.channel === "email" ? message.address : null,
        campaignId: campaign.id,
      });
      if (code) await tx.query("update marketing_messages set coupon_code = $2 where id = $1", [message.id, code.code]);
    }
  }
}

/** Builds the recipient list and moves the campaign to sending. The first batch goes out when `deliver` is set. */
export async function startCampaign(id: string, deliver: boolean) {
  const campaign = await getCampaign(id);
  if (!campaign) return { ok: false as const, error: "الحملة غير موجودة." };
  if (campaign.status !== "draft" && campaign.status !== "scheduled") return { ok: false as const, error: "الحملة بدأت من قبل." };
  const problem = (await readyProblem(campaign)) ?? (await channelProblem(campaign.channel));
  if (problem) return { ok: false as const, error: problem };
  const db = await getDb();
  const started = await db.transaction(async (tx) => {
    const claimed = await tx.query("update marketing_campaigns set status = 'sending', started_at = now(), updated_at = now() where id = $1 and status in ('draft', 'scheduled') returning id", [id]);
    if (!claimed.length) return { ok: false as const, error: "الحملة بدأت من قبل." };
    const audience = await audienceFor(campaign, tx);
    if (!audience.ok) throw new Error(audience.error);
    if (!audience.people.length) throw new Error("لا يوجد أحد يمكن الوصول إليه في هذا الجمهور.");
    await insertRecipients(tx, campaign, audience.people);
    return { ok: true as const, total: audience.people.length };
  }).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "تعذر بدء الحملة." }));
  if (!started.ok) return started;
  if (!deliver) return { ok: true as const, total: started.total, sent: 0, failed: 0, skipped: 0, pending: started.total, quiet: false };
  const progress = await deliverMessages({ campaignId: id }, 25);
  return { ok: true as const, total: started.total, ...progress };
}

export async function scheduleCampaign(id: string, localTime: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localTime)) return { ok: false as const, error: "اختر يوماً وساعة." };
  const at = marketWallTime(localTime);
  if (new Date(at).getTime() < Date.now() + 60_000) return { ok: false as const, error: "اختر موعداً في المستقبل." };
  const campaign = await getCampaign(id);
  if (!campaign) return { ok: false as const, error: "الحملة غير موجودة." };
  const problem = await readyProblem(campaign);
  if (problem) return { ok: false as const, error: problem };
  const row = await one("update marketing_campaigns set status = 'scheduled', scheduled_at = $2::timestamptz, updated_at = now() where id = $1 and status in ('draft', 'scheduled') returning id", [id, at]);
  return row ? { ok: true as const } : { ok: false as const, error: "الحملة بدأت من قبل." };
}

export async function unscheduleCampaign(id: string) {
  await sql("update marketing_campaigns set status = 'draft', scheduled_at = null, updated_at = now() where id = $1 and status = 'scheduled'", [id]);
  return { ok: true as const };
}

export async function continueCampaign(id: string) {
  const campaign = await getCampaign(id);
  if (!campaign) return { ok: false as const, error: "الحملة غير موجودة." };
  if (campaign.status === "paused") await sql("update marketing_campaigns set status = 'sending', updated_at = now() where id = $1", [id]);
  else if (campaign.status !== "sending") return { ok: false as const, error: "الحملة ليست قيد الإرسال." };
  const problem = await channelProblem(campaign.channel);
  if (problem) return { ok: false as const, error: problem };
  return { ok: true as const, ...(await deliverMessages({ campaignId: id }, 25)) };
}

export async function pauseCampaign(id: string) {
  await sql("update marketing_campaigns set status = 'paused', updated_at = now() where id = $1 and status = 'sending'", [id]);
  return { ok: true as const };
}

export async function cancelCampaign(id: string) {
  const row = await one("update marketing_campaigns set status = 'cancelled', finished_at = now(), updated_at = now() where id = $1 and status in ('scheduled', 'sending', 'paused') returning id", [id]);
  if (!row) return { ok: false as const, error: "لا تُلغى إلا حملة لم تكتمل." };
  await sql("update marketing_messages set status = 'skipped', error = 'cancelled' where campaign_id = $1 and status = 'pending'", [id]);
  return { ok: true as const };
}

export async function retryFailed(id: string) {
  await sql("update marketing_messages set status = 'pending', error = null where campaign_id = $1 and status = 'failed'", [id]);
  await sql("update marketing_campaigns set status = 'sending', finished_at = null, updated_at = now() where id = $1 and status in ('sent', 'paused')", [id]);
  return continueCampaign(id);
}

export async function deleteCampaign(id: string) {
  const removed = await sql("delete from marketing_campaigns where id = $1 and status in ('draft', 'cancelled') returning id", [id]);
  return removed.length ? { ok: true as const } : { ok: false as const, error: "تُحذف المسودة أو الحملة الملغاة فقط." };
}

export async function duplicateCampaign(id: string, actorId: string | null) {
  const campaign = await getCampaign(id);
  if (!campaign) return { ok: false as const, error: "الحملة غير موجودة." };
  return saveCampaignDraft(
    {
      name: `${campaign.name} (نسخة)`.slice(0, 120),
      channel: campaign.channel,
      segmentId: campaign.segmentId,
      filter: campaign.filter,
      excluded: campaign.excluded,
      templateId: campaign.templateId,
      content: campaign.content,
      couponId: campaign.couponId,
      uniqueCodes: campaign.uniqueCodes,
      linkUrl: campaign.linkUrl,
    },
    actorId,
  );
}

export type CampaignRecipient = {
  name: string | null;
  address: string;
  status: "pending" | "sent" | "failed" | "skipped";
  error: string | null;
  couponCode: string | null;
  clicks: number;
  sentAt: string | null;
};

export async function listCampaignRecipients(id: string, limit = 300): Promise<CampaignRecipient[]> {
  const rows = await sql(
    `select name, address, status, error, coupon_code, clicks, sent_at from marketing_messages
     where campaign_id = $1
     order by case status when 'failed' then 0 when 'pending' then 1 when 'skipped' then 2 else 3 end, address
     limit $2`,
    [id, limit],
  );
  return rows.map((row) => ({
    name: (row.name as string) ?? null,
    address: String(row.address),
    status: String(row.status) as CampaignRecipient["status"],
    error: (row.error as string) ?? null,
    couponCode: (row.coupon_code as string) ?? null,
    clicks: num(row.clicks),
    sentAt: isoOrNull(row.sent_at),
  }));
}

