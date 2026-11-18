import "server-only";
import { randomBytes } from "node:crypto";
import { siteConfig } from "@/config/site.config";
import { marketHour } from "@/lib/coupon-math";
import type { Channel } from "@/lib/marketing/audience";
import { cleanContent, firstName, renderEmail, renderSms, renderWhatsAppParams, renderWhatsAppText, type MessageContent, type MessageVars } from "@/lib/marketing/render";
import { getSiteSettings } from "../settings";
import { json, num, one, sql } from "../db";
import { sendEmailMessage, sendGowaText, sendSmsMessage, sendWhatsAppMessage, type SendResult } from "./send";
import { getMarketingSettings, getSmsChannel, getWhatsAppChannel, type ChannelState, type SmsConfig, type WhatsAppConfig } from "./settings";

type Row = Record<string, unknown>;

const tokenAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function newToken() {
  return Array.from(randomBytes(10), (byte) => tokenAlphabet[byte % tokenAlphabet.length]).join("");
}

function siteBase() {
  return siteConfig.url.replace(/\/$/, "");
}

export function trackedLink(token: string) {
  return `${siteBase()}/api/m/${token}`;
}

export function inQuietHours(now: Date, start: number, end: number) {
  if (start === end) return false;
  const hour = marketHour(now);
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export async function suppressAddress(channel: Channel, address: string, reason: string) {
  const clean = channel === "email" ? address.trim().toLowerCase() : address.trim();
  if (!clean) return;
  await sql(
    "insert into marketing_suppressions (channel, address, reason) values ($1, $2, $3) on conflict (channel, address) do nothing",
    [channel, clean, reason.slice(0, 40)],
  );
  await sql("update marketing_messages set status = 'skipped', error = $3 where channel = $1 and address = $2 and status = 'pending'", [channel, clean, reason.slice(0, 40)]);
  if (channel === "email") await sql("update profiles set marketing_opt_out = true where lower(email) = $1", [clean]);
}

export async function unsuppressAddress(channel: Channel, address: string) {
  await sql("delete from marketing_suppressions where channel = $1 and address = $2", [channel, address]);
  if (channel === "email") await sql("update profiles set marketing_opt_out = false where lower(email) = $1", [address.toLowerCase()]);
}

type Brand = { name: string; address: string | null };

async function brand(): Promise<Brand> {
  const settings = await getSiteSettings();
  const office = settings.offices[0];
  return { name: settings.legalName || settings.name, address: office ? `${office.city}، ${office.address}` : null };
}

type Senders = { sms: ChannelState<SmsConfig> | null; whatsapp: ChannelState<WhatsAppConfig> | null; brand: Brand | null };

async function sendOne(
  channel: Channel,
  input: { address: string; locale: string | null; content: MessageContent; vars: MessageVars; token: string; key: string },
  senders: Senders,
): Promise<SendResult> {
  if (channel === "email") {
    senders.brand ??= await brand();
    const mail = renderEmail({ content: input.content, locale: input.locale, vars: input.vars, brand: senders.brand.name, address: senders.brand.address });
    return sendEmailMessage({ to: input.address, subject: mail.subject, text: mail.text, html: mail.html, key: input.key });
  }
  if (channel === "sms") {
    senders.sms ??= await getSmsChannel();
    return sendSmsMessage(senders.sms, input.address, renderSms({ content: input.content, locale: input.locale, vars: input.vars }));
  }
  senders.whatsapp ??= await getWhatsAppChannel();
  if (senders.whatsapp.config.provider === "gowa") {
    return sendGowaText(senders.whatsapp, input.address, renderWhatsAppText({ content: input.content, locale: input.locale, vars: input.vars }));
  }
  return sendWhatsAppMessage(senders.whatsapp, input.address, {
    name: input.content.waName ?? "",
    language: input.content.waLanguage ?? "ar",
    params: renderWhatsAppParams(input.content, input.vars),
  });
}

/** One message straight to a staff address, not stored, for checking the copy before a send. */
export async function sendTestMessage(channel: Channel, address: string, content: MessageContent, couponCode: string | null) {
  const token = newToken();
  return sendOne(
    channel,
    { address, locale: "ar-EG", content, vars: { name: "تجربة", code: couponCode, link: `${siteBase()}/ar-EG` }, token, key: `test-${token}` },
    { sms: null, whatsapp: null, brand: null },
  );
}

async function sourceContent(row: Row, cache: Map<string, MessageContent | null>) {
  const key = row.campaign_id ? `c:${row.campaign_id}` : `a:${row.automation_id}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let content: MessageContent | null = null;
  if (row.campaign_id) {
    const campaign = await one<{ content: unknown }>("select content from marketing_campaigns where id = $1", [row.campaign_id]);
    if (campaign) content = cleanContent(json<Partial<MessageContent>>(campaign.content, {}));
  } else {
    const template = await one<Row>(
      `select t.subject, t.subject_en, t.body, t.body_en, t.wa_name, t.wa_language, t.wa_params
       from marketing_automations a join marketing_templates t on t.id = a.template_id where a.id = $1`,
      [row.automation_id],
    );
    if (template) {
      content = cleanContent({
        subject: template.subject as string | null,
        subjectEn: template.subject_en as string | null,
        body: String(template.body ?? ""),
        bodyEn: template.body_en as string | null,
        waName: template.wa_name as string | null,
        waLanguage: template.wa_language as string | null,
        waParams: json<string[]>(template.wa_params, []),
      });
    }
  }
  cache.set(key, content);
  return content;
}

export type DeliveryResult = { sent: number; failed: number; skipped: number; pending: number; quiet: boolean };

/**
 * Sends pending messages of one campaign, or of all automations. Suppressed addresses and customers over the
 * frequency cap are skipped. Text and WhatsApp wait while quiet hours are on.
 */
export async function deliverMessages(scope: { campaignId: string } | { automations: true }, limit = 25): Promise<DeliveryResult> {
  const settings = await getMarketingSettings();
  const now = new Date();
  const quiet = inQuietHours(now, settings.quietStart, settings.quietEnd);
  const params: unknown[] = [];
  const where = ["m.status = 'pending'"];
  if ("campaignId" in scope) {
    params.push(scope.campaignId);
    where.push(`m.campaign_id = $${params.length}`);
  } else where.push("m.automation_id is not null");
  if (quiet) where.push("m.channel = 'email'");
  params.push(limit);
  const rows = await sql<Row>(
    `select m.* from marketing_messages m where ${where.join(" and ")} order by m.created_at, m.address limit $${params.length}`,
    params,
  );
  const cache = new Map<string, MessageContent | null>();
  const senders: Senders = { sms: null, whatsapp: null, brand: null };
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of rows) {
    const channel = row.channel as Channel;
    const address = String(row.address);
    const blocked = await one("select 1 as blocked from marketing_suppressions where channel = $1 and address = $2", [channel, address]);
    if (blocked) {
      skipped += 1;
      await sql("update marketing_messages set status = 'skipped', error = 'unsubscribed' where id = $1", [row.id]);
      continue;
    }
    if (settings.capCount > 0) {
      const recent = await one<{ n: number }>(
        `select count(*)::int as n from marketing_messages
         where status = 'sent' and sent_at > now() - ($3::int * interval '1 day')
           and (address = $1 or ($2::uuid is not null and user_id = $2::uuid))`,
        [address, row.user_id ?? null, settings.capDays],
      );
      if (num(recent?.n) >= settings.capCount) {
        skipped += 1;
        await sql("update marketing_messages set status = 'skipped', error = 'cap' where id = $1", [row.id]);
        continue;
      }
    }
    const content = await sourceContent(row, cache);
    if (!content) {
      failed += 1;
      await sql("update marketing_messages set status = 'failed', error = 'no template', attempts = attempts + 1 where id = $1", [row.id]);
      continue;
    }
    const token = String(row.token);
    const result = await sendOne(
      channel,
      {
        address,
        locale: (row.locale as string) ?? null,
        content,
        vars: { name: firstName(String(row.name ?? "")), code: (row.coupon_code as string) ?? null, link: trackedLink(token) },
        token,
        key: String(row.id),
      },
      senders,
    );
    if (result.ok) {
      sent += 1;
      await sql("update marketing_messages set status = 'sent', sent_at = now(), error = null, provider_ref = $2, attempts = attempts + 1 where id = $1", [
        row.id,
        result.ref,
      ]);
    } else {
      failed += 1;
      await sql("update marketing_messages set status = 'failed', error = $2, attempts = attempts + 1 where id = $1", [row.id, result.error.slice(0, 300)]);
    }
  }
  let pending = 0;
  if ("campaignId" in scope) {
    const left = await one<{ n: number }>("select count(*)::int as n from marketing_messages where campaign_id = $1 and status = 'pending'", [scope.campaignId]);
    pending = num(left?.n);
    if (pending === 0) {
      await sql("update marketing_campaigns set status = 'sent', finished_at = now(), updated_at = now() where id = $1 and status = 'sending'", [scope.campaignId]);
    }
  } else {
    const left = await one<{ n: number }>("select count(*)::int as n from marketing_messages where automation_id is not null and status = 'pending'");
    pending = num(left?.n);
  }
  return { sent, failed, skipped, pending, quiet };
}
