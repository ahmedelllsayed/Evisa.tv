import { randomBytes } from "node:crypto";
import { siteConfig } from "@/config/site.config";
import type { FunnelEvent } from "@/lib/funnel";
import { one, sql } from "./db";

export async function recordFunnel(name: FunnelEvent, locale: string | null, destinationSlug: string | null) {
  await sql("insert into funnel_events (name, locale, destination_slug) values ($1, $2, $3)", [
    name,
    locale?.slice(0, 12) || null,
    destinationSlug?.slice(0, 80) || null,
  ]);
}

export async function funnelWeek() {
  return sql<{ name: string; n: number }>(
    `select name, count(*)::int as n from funnel_events
     where created_at > now() - interval '7 days'
     group by name order by n desc`,
  );
}

export async function ensureReferralCode(userId: string) {
  const existing = await one<{ referral_code: string | null }>("select referral_code from profiles where id = $1", [userId]);
  if (existing?.referral_code) return existing.referral_code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(5).toString("hex").slice(0, 8);
    const row = await one<{ referral_code: string }>(
      `update profiles set referral_code = $2 where id = $1 and referral_code is null
       and not exists (select 1 from profiles other where other.referral_code = $2)
       returning referral_code`,
      [userId, code],
    );
    if (row?.referral_code) return row.referral_code;
    const again = await one<{ referral_code: string | null }>("select referral_code from profiles where id = $1", [userId]);
    if (again?.referral_code) return again.referral_code;
  }
  return "";
}

export function referralLink(code: string) {
  return `${siteConfig.url}/?ref=${code}`;
}
