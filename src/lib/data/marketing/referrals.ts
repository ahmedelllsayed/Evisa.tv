import "server-only";
import { randomInt } from "node:crypto";
import { generateCouponCodes } from "../coupons";
import { getDb, iso, isoOrNull, num, one, sql } from "../db";
import { notifyUser } from "../notifications";
import { getMarketingSettings, saveMarketingSettings, type MarketingSettings } from "./settings";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function systemCode(prefix: string) {
  return `${prefix}-${Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("")}`;
}

/** Keeps the two hidden coupons that carry the referral discounts in line with the settings. */
async function syncSystemCoupons(settings: MarketingSettings) {
  const friend = settings.referral.friend;
  const reward = settings.referral.reward;
  const rows: [string, string, typeof friend, boolean][] = [
    ["referral_friend", "FRIEND", friend, true],
    ["referral_reward", "THANKS", reward, false],
  ];
  for (const [system, prefix, rule, firstOrder] of rows) {
    const existing = await one<{ id: string }>("select id from coupons where system = $1", [system]);
    if (existing) {
      await sql(
        `update coupons set kind = $2, value = $3, applies_to = $4, active = $5, first_order_only = $6, per_customer = 1,
           max_uses = null, updated_at = now()
         where id = $1`,
        [existing.id, rule.kind, rule.value, rule.appliesTo, settings.referral.enabled, firstOrder],
      );
      continue;
    }
    await sql(
      `insert into coupons (code, name, kind, value, applies_to, active, first_order_only, per_customer, system)
       values ($1, $2, $3, $4, $5, $6, $7, 1, $8)`,
      [systemCode(prefix), system === "referral_friend" ? "خصم الصديق" : "مكافأة الداعي", rule.kind, rule.value, rule.appliesTo, settings.referral.enabled, firstOrder, system],
    );
  }
}

export async function saveReferralSettings(next: MarketingSettings["referral"]) {
  const current = await getMarketingSettings();
  const saved = await saveMarketingSettings({ ...current, referral: next });
  await syncSystemCoupons(saved);
  return saved.referral;
}

/** Gives the referrer a single-use code once the referred friend pays a first application. */
export async function issueReferralReward(applicationId: string) {
  const settings = await getMarketingSettings();
  if (!settings.referral.enabled) return;
  const app = await one<{ user_id: string; referred_by: string | null; email: string | null }>(
    `select a.user_id, p.referred_by, p.email from applications a join profiles p on p.id = a.user_id
     where a.id = $1 and a.paid_at is not null`,
    [applicationId],
  );
  if (!app?.referred_by) return;
  const earlier = await one(
    "select 1 as paid from applications where user_id = $1 and paid_at is not null and id <> $2 limit 1",
    [app.user_id, applicationId],
  );
  if (earlier) return;
  const coupon = await one<{ id: string }>("select id from coupons where system = 'referral_reward' and active");
  if (!coupon) return;
  const db = await getDb();
  const issued = await db.transaction(async (tx) => {
    const claimed = await tx.query<{ id: string }>(
      `insert into referral_rewards (referrer_id, friend_id, application_id) values ($1, $2, $3)
       on conflict (application_id) do nothing returning id`,
      [app.referred_by, app.user_id, applicationId],
    );
    if (!claimed[0]) return null;
    const expires = new Date(Date.now() + settings.referral.reward.validDays * 864e5).toISOString();
    const [code] = await generateCouponCodes(tx, coupon.id, 1, { prefix: "THANKS", userId: app.referred_by, expiresAt: expires });
    if (!code) throw new Error("referral code was not created");
    await tx.query("update referral_rewards set code_id = $2 where id = $1", [claimed[0].id, code.id]);
    return code.code;
  });
  if (!issued || !app.referred_by) return;
  await notifyUser({
    userId: app.referred_by,
    title: "مكافأة الإحالة / Referral reward",
    body: `صديقك أتم طلبه. رمز خصمك: ${issued}. Your friend completed an application. Your code: ${issued}`,
  });
}

/** A refund before the referrer used the code cancels the reward. */
export async function cancelReferralReward(applicationId: string) {
  await sql(
    `update coupon_codes k set cancelled_at = now()
     from referral_rewards r
     where r.application_id = $1 and r.code_id = k.id and r.status = 'issued' and k.cancelled_at is null
       and not exists (select 1 from coupon_redemptions x where x.code_id = k.id and x.status = 'used')`,
    [applicationId],
  );
  await sql(
    `update referral_rewards r set status = 'cancelled', cancelled_at = now()
     where r.application_id = $1 and r.status = 'issued'
       and exists (select 1 from coupon_codes k where k.id = r.code_id and k.cancelled_at is not null)`,
    [applicationId],
  );
}

export type AccountReward = { code: string; expiresAt: string | null; used: boolean; cancelled: boolean };

export async function listRewardsForUser(userId: string): Promise<AccountReward[]> {
  const rows = await sql(
    `select k.code, k.expires_at, k.cancelled_at,
            exists (select 1 from coupon_redemptions x where x.code_id = k.id and x.status = 'used') as used
     from referral_rewards r join coupon_codes k on k.id = r.code_id
     where r.referrer_id = $1
     order by r.created_at desc limit 20`,
    [userId],
  );
  return rows.map((row) => ({
    code: String(row.code),
    expiresAt: isoOrNull(row.expires_at),
    used: Boolean(row.used),
    cancelled: Boolean(row.cancelled_at),
  }));
}

export type ReferrerRow = { id: string; email: string; friends: number; paidFriends: number; rewards: number; used: number; cancelled: number };
export type RewardRow = { referrer: string; friend: string; reference: string; code: string | null; status: string; used: boolean; at: string };

export async function referralOverview() {
  const [referrers, rewards, totals] = await Promise.all([
    sql(
      `select r.id, r.email,
              count(distinct f.id)::int as friends,
              count(distinct f.id) filter (where exists (select 1 from applications a where a.user_id = f.id and a.paid_at is not null))::int as paid_friends,
              (select count(*)::int from referral_rewards w where w.referrer_id = r.id) as rewards,
              (select count(*)::int from referral_rewards w join coupon_redemptions x on x.code_id = w.code_id and x.status = 'used' where w.referrer_id = r.id) as used,
              (select count(*)::int from referral_rewards w where w.referrer_id = r.id and w.status = 'cancelled') as cancelled
       from profiles r join profiles f on f.referred_by = r.id
       group by r.id, r.email
       order by friends desc, r.email
       limit 100`,
    ),
    sql(
      `select r.email as referrer, f.email as friend, a.reference, k.code, w.status, w.created_at,
              exists (select 1 from coupon_redemptions x where x.code_id = w.code_id and x.status = 'used') as used
       from referral_rewards w
       join profiles r on r.id = w.referrer_id
       join profiles f on f.id = w.friend_id
       join applications a on a.id = w.application_id
       left join coupon_codes k on k.id = w.code_id
       order by w.created_at desc limit 50`,
    ),
    one<{ referred: number; paid: number }>(
      `select count(*)::int as referred,
              count(*) filter (where exists (select 1 from applications a where a.user_id = p.id and a.paid_at is not null))::int as paid
       from profiles p where p.referred_by is not null`,
    ),
  ]);
  return {
    referred: num(totals?.referred),
    paid: num(totals?.paid),
    referrers: referrers.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      friends: num(row.friends),
      paidFriends: num(row.paid_friends),
      rewards: num(row.rewards),
      used: num(row.used),
      cancelled: num(row.cancelled),
    })) as ReferrerRow[],
    rewards: rewards.map((row) => ({
      referrer: String(row.referrer),
      friend: String(row.friend),
      reference: String(row.reference),
      code: (row.code as string) ?? null,
      status: String(row.status),
      used: Boolean(row.used),
      at: iso(row.created_at),
    })) as RewardRow[],
  };
}
