import "server-only";
import type { Channel } from "@/lib/marketing/audience";
import { contentProblem } from "@/lib/marketing/render";
import { generateCouponCodes } from "../coupons";
import { getDb, iso, isoOrNull, num, one, sql } from "../db";
import { channelAddress } from "./audience";
import { getTemplate } from "./library";
import { newToken } from "./queue";

type Row = Record<string, unknown>;
const uuidPattern = /^[0-9a-f-]{36}$/i;

export const automationTriggers = ["abandoned", "lapsed", "approved", "signup"] as const;
export type AutomationTrigger = (typeof automationTriggers)[number];

/** Events older than the delay plus this window are never picked up, so turning a rule on does not mail old history. */
const WINDOW_HOURS = 14 * 24;

export type Automation = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  delayHours: number;
  channel: Channel;
  templateId: string | null;
  templateName: string | null;
  couponId: string | null;
  couponCode: string | null;
  uniqueCodes: boolean;
  active: boolean;
  lastRunAt: string | null;
  createdAt: string;
  sent: number;
  pending: number;
  failed: number;
  skipped: number;
  clicks: number;
};

export type AutomationInput = {
  id?: string | null;
  name: string;
  trigger: AutomationTrigger;
  delayHours: number;
  channel: Channel;
  templateId: string | null;
  couponId: string | null;
  uniqueCodes: boolean;
};

function toAutomation(row: Row): Automation {
  return {
    id: String(row.id),
    name: String(row.name),
    trigger: row.trigger as AutomationTrigger,
    delayHours: num(row.delay_hours),
    channel: row.channel as Channel,
    templateId: (row.template_id as string) ?? null,
    templateName: (row.template_name as string) ?? null,
    couponId: (row.coupon_id as string) ?? null,
    couponCode: (row.coupon_code as string) ?? null,
    uniqueCodes: Boolean(row.unique_codes),
    active: Boolean(row.active),
    lastRunAt: isoOrNull(row.last_run_at),
    createdAt: iso(row.created_at),
    sent: num(row.sent),
    pending: num(row.pending),
    failed: num(row.failed),
    skipped: num(row.skipped),
    clicks: num(row.clicks),
  };
}

export async function listAutomations() {
  const rows = await sql(
    `select a.*, t.name as template_name, c.code as coupon_code,
            count(m.id) filter (where m.status = 'sent')::int as sent,
            count(m.id) filter (where m.status = 'pending')::int as pending,
            count(m.id) filter (where m.status = 'failed')::int as failed,
            count(m.id) filter (where m.status = 'skipped')::int as skipped,
            coalesce(sum(m.clicks), 0)::int as clicks
     from marketing_automations a
     left join marketing_templates t on t.id = a.template_id
     left join coupons c on c.id = a.coupon_id
     left join marketing_messages m on m.automation_id = a.id
     group by a.id, t.name, c.code
     order by a.created_at`,
  );
  return rows.map(toAutomation);
}

export async function saveAutomation(input: AutomationInput) {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false as const, error: "اكتب اسماً للقاعدة." };
  if (!automationTriggers.includes(input.trigger)) return { ok: false as const, error: "اختر المحفّز." };
  const delay = Math.round(Number(input.delayHours));
  if (!Number.isInteger(delay) || delay < 1 || delay > 24 * 365) return { ok: false as const, error: "المدة من ساعة إلى سنة." };
  const template = await getTemplate(input.templateId);
  if (!template) return { ok: false as const, error: "اختر قالباً." };
  if (template.channel !== input.channel) return { ok: false as const, error: "القالب لقناة أخرى." };
  const couponId = input.couponId && uuidPattern.test(input.couponId) ? input.couponId : null;
  const params = [name, input.trigger, delay, input.channel, template.id, couponId, Boolean(couponId && input.uniqueCodes)];
  if (input.id) {
    const row = await one<{ id: string }>(
      `update marketing_automations set name=$2, trigger=$3, delay_hours=$4, channel=$5, template_id=$6, coupon_id=$7, unique_codes=$8, updated_at=now()
       where id=$1 returning id`,
      [input.id, ...params],
    );
    return row ? { ok: true as const, id: row.id } : { ok: false as const, error: "القاعدة غير موجودة." };
  }
  const row = await one<{ id: string }>(
    `insert into marketing_automations (name, trigger, delay_hours, channel, template_id, coupon_id, unique_codes)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    params,
  );
  return { ok: true as const, id: row!.id };
}

export async function setAutomationActive(id: string, active: boolean) {
  if (active) {
    const row = await one<{ template_id: string | null }>("select template_id from marketing_automations where id = $1", [id]);
    const template = await getTemplate(row?.template_id ?? null);
    if (!template) return { ok: false as const, error: "القالب المرتبط حُذف. اختر قالباً ثم فعّل القاعدة." };
    const problem = contentProblem(template.channel, template.content);
    if (problem) return { ok: false as const, error: problem };
  }
  await sql("update marketing_automations set active = $2, updated_at = now() where id = $1", [id, active]);
  return { ok: true as const };
}

export async function deleteAutomation(id: string) {
  const removed = await sql("delete from marketing_automations where id = $1 returning id", [id]);
  return removed.length ? { ok: true as const } : { ok: false as const, error: "القاعدة غير موجودة." };
}

function candidatesSql(trigger: AutomationTrigger) {
  const window = "between now() - (($1::int + $2::int) * interval '1 hour') and now() - ($1::int * interval '1 hour')";
  switch (trigger) {
    case "abandoned":
      return `select a.user_id, a.id::text as ref from applications a
              where a.paid_at is null and a.status in ('draft', 'payment_pending') and a.updated_at ${window}`;
    case "lapsed":
      return `select last.user_id, 'lapsed:' || last.id::text as ref from (
                select distinct on (a.user_id) a.user_id, a.id, a.paid_at from applications a
                where a.paid_at is not null order by a.user_id, a.paid_at desc
              ) last where last.paid_at ${window}`;
    case "approved":
      return `select a.user_id, a.id::text as ref from application_status_history h
              join applications a on a.id = h.application_id
              where h.to_status = 'approved' and h.created_at ${window}`;
    case "signup":
      return `select p.id as user_id, 'signup:' || p.id::text as ref from profiles p
              where p.created_at ${window} and not exists (select 1 from applications a where a.user_id = p.id)`;
    default: {
      const unknown: never = trigger;
      throw new Error(`unknown trigger ${String(unknown)}`);
    }
  }
}

/** Queues one message per event for each active rule. Delivery happens on the shared queue. */
export async function runAutomations() {
  const rules = await sql<Row>("select * from marketing_automations where active order by created_at");
  let queued = 0;
  for (const rule of rules) {
    const channel = rule.channel as Channel;
    const rows = await sql<Row>(
      `select x.ref, p.id as user_id, p.email, p.phone, p.locale,
              coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), nullif(trim(p.full_name), ''), p.email) as name
       from (${candidatesSql(rule.trigger as AutomationTrigger)}) x
       join profiles p on p.id = x.user_id
       where p.role = 'user' and coalesce(p.banned, false) = false and p.anonymized_at is null
         and not exists (select 1 from marketing_messages m where m.automation_id = $3 and m.ref_key = x.ref)
       limit 500`,
      [num(rule.delay_hours), WINDOW_HOURS, rule.id],
    );
    const coupon = rule.coupon_id ? await one<{ id: string; code: string }>("select id, code from coupons where id = $1", [rule.coupon_id]) : null;
    const db = await getDb();
    for (const row of rows) {
      const address = channelAddress({ email: (row.email as string) ?? null, phone: (row.phone as string) ?? null }, channel);
      if (!address) continue;
      await db.transaction(async (tx) => {
        const [message] = await tx.query<{ id: string }>(
          `insert into marketing_messages (token, automation_id, ref_key, channel, user_id, address, name, locale, coupon_code)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing returning id`,
          [newToken(), rule.id, row.ref, channel, row.user_id, address, row.name, row.locale ?? null, coupon?.code ?? null],
        );
        if (!message) return;
        queued += 1;
        if (coupon && rule.unique_codes) {
          const [code] = await generateCouponCodes(tx, coupon.id, 1, { prefix: coupon.code.slice(0, 8), userId: String(row.user_id) });
          if (code) await tx.query("update marketing_messages set coupon_code = $2 where id = $1", [message.id, code.code]);
        }
      });
    }
    await sql("update marketing_automations set last_run_at = now() where id = $1", [rule.id]);
  }
  return queued;
}