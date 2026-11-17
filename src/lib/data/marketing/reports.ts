import "server-only";
import type { Channel } from "@/lib/marketing/audience";
import { iso, isoOrNull, num, sql } from "../db";

type Row = Record<string, unknown>;

export type ChannelTotals = { channel: Channel; sent: number; failed: number; skipped: number; clicks: number; clickers: number; unsubscribed: number };

export type SourceResult = {
  id: string;
  name: string;
  kind: "campaign" | "automation";
  channel: Channel;
  status: string;
  at: string | null;
  sent: number;
  failed: number;
  clickers: number;
  unsubscribed: number;
  couponUses: number;
  discount: number;
  couponRevenue: number;
  clickRevenue: number;
};

export type CouponResult = { id: string; code: string; name: string | null; uses: number; discount: number; revenue: number; system: string | null };

const attributedRedemptions = (source: "campaign" | "automation") =>
  source === "campaign"
    ? `select distinct r.id, r.amount, a.total_amount from coupon_redemptions r
       join applications a on a.id = r.application_id
       where r.status = 'used' and r.updated_at > now() - ($1::int * interval '1 day')
         and (
           exists (select 1 from coupon_codes k where k.id = r.code_id and k.campaign_id = c.id)
           or (r.coupon_id = c.coupon_id and r.updated_at >= coalesce(c.started_at, c.created_at)
               and exists (select 1 from marketing_messages m where m.campaign_id = c.id and m.user_id = r.user_id and m.status = 'sent'))
         )`
    : `select distinct r.id, r.amount, a.total_amount from coupon_redemptions r
       join applications a on a.id = r.application_id
       where r.status = 'used' and r.updated_at > now() - ($1::int * interval '1 day')
         and r.coupon_id = c.coupon_id
         and exists (select 1 from marketing_messages m where m.automation_id = c.id and m.user_id = r.user_id and m.status = 'sent' and m.sent_at <= r.updated_at)`;

function toSource(row: Row, kind: SourceResult["kind"]): SourceResult {
  return {
    id: String(row.id),
    name: String(row.name),
    kind,
    channel: row.channel as Channel,
    status: String(row.status),
    at: isoOrNull(row.at),
    sent: num(row.sent),
    failed: num(row.failed),
    clickers: num(row.clickers),
    unsubscribed: num(row.unsubscribed),
    couponUses: num(row.coupon_uses),
    discount: num(row.discount),
    couponRevenue: num(row.coupon_revenue),
    clickRevenue: num(row.click_revenue),
  };
}

/** Every figure comes from stored messages, redemptions, and paid applications in the period. */
export async function marketingOverview(days: number) {
  const period = [days];
  const [channelRows, couponTotals, campaignRows, automationRows, couponRows, referral] = await Promise.all([
    sql(
      `select m.channel,
              count(*) filter (where m.status = 'sent')::int as sent,
              count(*) filter (where m.status = 'failed')::int as failed,
              count(*) filter (where m.status = 'skipped')::int as skipped,
              coalesce(sum(m.clicks), 0)::int as clicks,
              count(*) filter (where m.clicks > 0)::int as clickers,
              count(*) filter (where m.unsubscribed_at is not null)::int as unsubscribed
       from marketing_messages m
       where coalesce(m.sent_at, m.created_at) > now() - ($1::int * interval '1 day')
       group by m.channel`,
      period,
    ),
    sql(
      `select count(*)::int as uses, coalesce(sum(r.amount), 0) as discount, coalesce(sum(a.total_amount), 0) as revenue
       from coupon_redemptions r join applications a on a.id = r.application_id
       where r.status = 'used' and r.updated_at > now() - ($1::int * interval '1 day')`,
      period,
    ),
    sql(
      `select c.id, c.name, c.channel, c.status, coalesce(c.started_at, c.scheduled_at, c.created_at) as at,
              (select count(*)::int from marketing_messages m where m.campaign_id = c.id and m.status = 'sent') as sent,
              (select count(*)::int from marketing_messages m where m.campaign_id = c.id and m.status = 'failed') as failed,
              (select count(*)::int from marketing_messages m where m.campaign_id = c.id and m.clicks > 0) as clickers,
              (select count(*)::int from marketing_messages m where m.campaign_id = c.id and m.unsubscribed_at is not null) as unsubscribed,
              (select count(*)::int from (${attributedRedemptions("campaign")}) x) as coupon_uses,
              (select coalesce(sum(x.amount), 0) from (${attributedRedemptions("campaign")}) x) as discount,
              (select coalesce(sum(x.total_amount), 0) from (${attributedRedemptions("campaign")}) x) as coupon_revenue,
              (select coalesce(sum(a.total_amount), 0) from applications a
                where a.campaign_id = c.id and a.paid_at > now() - ($1::int * interval '1 day')
                  and (c.coupon_id is null or a.coupon_id is distinct from c.coupon_id)) as click_revenue
       from marketing_campaigns c
       where c.status <> 'draft' and coalesce(c.started_at, c.scheduled_at, c.created_at) > now() - ($1::int * interval '1 day')
       order by at desc`,
      period,
    ),
    sql(
      `select c.id, c.name, c.channel, case when c.active then 'active' else 'off' end as status, c.last_run_at as at,
              (select count(*)::int from marketing_messages m where m.automation_id = c.id and m.status = 'sent' and m.sent_at > now() - ($1::int * interval '1 day')) as sent,
              (select count(*)::int from marketing_messages m where m.automation_id = c.id and m.status = 'failed' and m.created_at > now() - ($1::int * interval '1 day')) as failed,
              (select count(*)::int from marketing_messages m where m.automation_id = c.id and m.clicks > 0 and m.clicked_at > now() - ($1::int * interval '1 day')) as clickers,
              (select count(*)::int from marketing_messages m where m.automation_id = c.id and m.unsubscribed_at > now() - ($1::int * interval '1 day')) as unsubscribed,
              (select count(*)::int from (${attributedRedemptions("automation")}) x) as coupon_uses,
              (select coalesce(sum(x.amount), 0) from (${attributedRedemptions("automation")}) x) as discount,
              (select coalesce(sum(x.total_amount), 0) from (${attributedRedemptions("automation")}) x) as coupon_revenue,
              0 as click_revenue
       from marketing_automations c
       order by c.created_at`,
      period,
    ),
    sql(
      `select c.id, c.code, c.name, c.system, count(r.id)::int as uses, coalesce(sum(r.amount), 0) as discount, coalesce(sum(a.total_amount), 0) as revenue
       from coupons c
       join coupon_redemptions r on r.coupon_id = c.id and r.status = 'used' and r.updated_at > now() - ($1::int * interval '1 day')
       join applications a on a.id = r.application_id
       group by c.id order by uses desc limit 50`,
      period,
    ),
    sql(
      `select count(*)::int as rewards,
              count(*) filter (where exists (select 1 from coupon_redemptions x where x.code_id = w.code_id and x.status = 'used'))::int as used
       from referral_rewards w where w.created_at > now() - ($1::int * interval '1 day')`,
      period,
    ),
  ]);
  const channels: ChannelTotals[] = (["email", "sms", "whatsapp"] as const).map((channel) => {
    const row = channelRows.find((item) => item.channel === channel);
    return {
      channel,
      sent: num(row?.sent),
      failed: num(row?.failed),
      skipped: num(row?.skipped),
      clicks: num(row?.clicks),
      clickers: num(row?.clickers),
      unsubscribed: num(row?.unsubscribed),
    };
  });
  return {
    channels,
    coupons: { uses: num(couponTotals[0]?.uses), discount: num(couponTotals[0]?.discount), revenue: num(couponTotals[0]?.revenue) },
    referral: { rewards: num(referral[0]?.rewards), used: num(referral[0]?.used) },
    campaigns: campaignRows.map((row) => toSource(row, "campaign")),
    automations: automationRows.map((row) => toSource(row, "automation")),
    couponResults: couponRows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: (row.name as string) ?? null,
      system: (row.system as string) ?? null,
      uses: num(row.uses),
      discount: num(row.discount),
      revenue: num(row.revenue),
    })) as CouponResult[],
  };
}

export async function campaignOutcome(id: string) {
  const rows = await sql(
    `select c.id, c.name, c.channel, c.status, c.started_at as at,
            0 as sent, 0 as failed, 0 as clickers,
            (select count(*)::int from marketing_messages m where m.campaign_id = c.id and m.unsubscribed_at is not null) as unsubscribed,
            (select count(*)::int from (${attributedRedemptions("campaign")}) x) as coupon_uses,
            (select coalesce(sum(x.amount), 0) from (${attributedRedemptions("campaign")}) x) as discount,
            (select coalesce(sum(x.total_amount), 0) from (${attributedRedemptions("campaign")}) x) as coupon_revenue,
            (select coalesce(sum(a.total_amount), 0) from applications a
              where a.campaign_id = c.id and a.paid_at is not null and (c.coupon_id is null or a.coupon_id is distinct from c.coupon_id)) as click_revenue
     from marketing_campaigns c where c.id = $2`,
    [36500, id],
  );
  return rows[0] ? toSource(rows[0], "campaign") : null;
}

export function csv(rows: unknown[][]) {
  return rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function messagesCsv(campaignId: string) {
  const rows = await sql(
    "select name, address, status, error, coupon_code, clicks, sent_at, unsubscribed_at from marketing_messages where campaign_id = $1 order by address",
    [campaignId],
  );
  return csv([
    ["name", "address", "status", "error", "coupon_code", "clicks", "sent_at", "unsubscribed_at"],
    ...rows.map((row) => [row.name, row.address, row.status, row.error, row.coupon_code, row.clicks, isoOrNull(row.sent_at), isoOrNull(row.unsubscribed_at)]),
  ]);
}

export async function campaignsCsv(days: number) {
  const overview = await marketingOverview(days);
  return csv([
    ["kind", "name", "channel", "status", "sent", "failed", "clickers", "unsubscribed", "coupon_uses", "discount", "coupon_revenue", "click_revenue"],
    ...[...overview.campaigns, ...overview.automations].map((row) => [
      row.kind,
      row.name,
      row.channel,
      row.status,
      row.sent,
      row.failed,
      row.clickers,
      row.unsubscribed,
      row.couponUses,
      row.discount,
      row.couponRevenue,
      row.clickRevenue,
    ]),
  ]);
}

export async function couponUsesCsv(couponId: string) {
  const rows = await sql(
    `select a.reference, p.email, k.code, r.status, r.amount, a.total_amount, r.updated_at
     from coupon_redemptions r join applications a on a.id = r.application_id
     left join profiles p on p.id = r.user_id left join coupon_codes k on k.id = r.code_id
     where r.coupon_id = $1 order by r.updated_at desc`,
    [couponId],
  );
  return csv([
    ["reference", "email", "code", "status", "discount", "total", "at"],
    ...rows.map((row) => [row.reference, row.email, row.code, row.status, row.amount, row.total_amount, iso(row.updated_at)]),
  ]);
}

export async function couponCodesCsv(couponId: string, base: string) {
  const rows = await sql(
    `select k.code, k.email, p.email as user_email, k.expires_at, k.cancelled_at,
            exists (select 1 from coupon_redemptions r where r.code_id = k.id and r.status = 'used') as used
     from coupon_codes k left join profiles p on p.id = k.user_id where k.coupon_id = $1 order by k.created_at`,
    [couponId],
  );
  return csv([
    ["code", "link", "assigned_to", "expires_at", "cancelled", "used"],
    ...rows.map((row) => [
      row.code,
      `${base}/ar-EG?coupon=${row.code}`,
      row.user_email ?? row.email ?? "",
      isoOrNull(row.expires_at),
      row.cancelled_at ? "yes" : "no",
      row.used ? "yes" : "no",
    ]),
  ]);
}
