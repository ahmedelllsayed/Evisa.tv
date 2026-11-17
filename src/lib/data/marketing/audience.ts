import "server-only";
import type { Db } from "@/lib/db/core";
import {
  AUDIENCE_CAP,
  cleanAudienceFilter,
  normalizeSex,
  type AudienceFilter,
  type AudiencePerson,
  type Channel,
  type SexFilter,
} from "@/lib/marketing/audience";
import { normalizePhone } from "@/lib/marketing/phone";
import { getDb, num } from "../db";

type Row = Record<string, unknown>;
type Queryable = Pick<Db, "query">;

const sexValues: Record<SexFilter, string[]> = {
  male: ["m", "male", "ذكر"],
  female: ["f", "female", "أنثى", "انثى"],
  other: ["other", "آخر"],
};

const latestTraveler = (column: "sex" | "nationality") => `(
  select t.${column} from travelers t
  join applications a on a.id = t.application_id
  where a.user_id = p.id and nullif(trim(t.${column}), '') is not null
  order by a.created_at desc, t.sort_order
  limit 1
)`;

function likePattern(query: string) {
  const cleaned = query.trim().replace(/[%_\\]/g, "").slice(0, 80);
  return cleaned ? `%${cleaned}%` : "";
}

function customerWhere(filter: AudienceFilter, params: unknown[]) {
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const where = ["coalesce(p.banned, false) = false", "p.anonymized_at is null", "p.role = 'user'"];
  const pattern = likePattern(filter.query);
  if (pattern) {
    const slot = add(pattern);
    where.push(`(p.email ilike ${slot} or coalesce(p.full_name, '') ilike ${slot} or coalesce(p.first_name, '') ilike ${slot} or coalesce(p.last_name, '') ilike ${slot} or coalesce(p.phone, '') ilike ${slot})`);
  }
  if (filter.visaType) {
    where.push(`exists (
      select 1 from applications a
      left join visa_options vo on vo.id = a.visa_option_id
      left join destinations d on d.id = a.destination_id
      where a.user_id = p.id and a.paid_at is not null
        and coalesce(nullif(a.visa_details->>'visaType', ''), vo.visa_type, d.visa_type) = ${add(filter.visaType)}
    )`);
  }
  if (filter.destinationId) {
    where.push(`exists (select 1 from applications a where a.user_id = p.id and a.paid_at is not null and a.destination_id = ${add(filter.destinationId)})`);
  }
  if (filter.nationality) {
    where.push(`upper(coalesce(nullif(trim(p.nationality), ''), ${latestTraveler("nationality")}, '')) = ${add(filter.nationality)}`);
  }
  if (filter.sex) {
    const slots = sexValues[filter.sex].map(add);
    where.push(`lower(coalesce(nullif(trim(p.sex), ''), ${latestTraveler("sex")}, '')) in (${slots.join(", ")})`);
  }
  if (filter.purchases === "none") where.push("stats.purchases = 0");
  if (filter.purchases === "once") where.push("stats.purchases = 1");
  if (filter.purchases === "repeat") where.push("stats.purchases >= 2");
  if (filter.purchases === "min") where.push(`stats.purchases >= ${add(filter.minPurchases)}`);
  if (filter.lastPurchase === "within") where.push(`stats.last_paid >= now() - (${add(filter.lastPurchaseDays)}::int * interval '1 day')`);
  if (filter.lastPurchase === "before") where.push(`stats.last_paid < now() - (${add(filter.lastPurchaseDays)}::int * interval '1 day')`);
  if (filter.minSpent) where.push(`stats.spent >= ${add(filter.minSpent)}`);
  if (filter.joinedFrom) where.push(`p.created_at >= (${add(filter.joinedFrom)}::date)`);
  if (filter.joinedTo) where.push(`p.created_at < (${add(filter.joinedTo)}::date + 1)`);
  if (filter.locale) {
    where.push(`lower(coalesce(nullif(p.locale, ''), (select a.locale from applications a where a.user_id = p.id order by a.created_at desc limit 1), 'en')) like ${add(`${filter.locale}%`)}`);
  }
  const unpaid = "exists (select 1 from applications a where a.user_id = p.id and a.paid_at is null and a.status in ('draft', 'payment_pending'))";
  if (filter.hasUnpaid === "yes") where.push(unpaid);
  if (filter.hasUnpaid === "no") where.push(`not ${unpaid}`);
  if (filter.hasPhone === "yes") where.push("nullif(trim(p.phone), '') is not null");
  if (filter.hasPhone === "no") where.push("nullif(trim(p.phone), '') is null");
  const usedCoupon = "exists (select 1 from coupon_redemptions r where r.user_id = p.id and r.status = 'used')";
  if (filter.usedCoupon === "yes") where.push(usedCoupon);
  if (filter.usedCoupon === "no") where.push(`not ${usedCoupon}`);
  if (filter.referred === "yes") where.push("p.referred_by is not null");
  if (filter.referred === "no") where.push("p.referred_by is null");
  return where;
}

const customerFrom = `
  from profiles p
  left join lateral (
    select count(*)::int as purchases, max(a.paid_at) as last_paid, coalesce(sum(a.total_amount), 0) as spent
    from applications a where a.user_id = p.id and a.paid_at is not null
  ) stats on true`;

async function customers(q: Queryable, filter: AudienceFilter, limit: number): Promise<AudiencePerson[]> {
  const params: unknown[] = [];
  const where = customerWhere(filter, params);
  params.push(limit);
  const rows = await q.query<Row>(
    `select p.id, lower(p.email) as email, p.phone,
            coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), nullif(trim(p.full_name), ''), p.email) as name,
            coalesce(nullif(p.locale, ''), (select a.locale from applications a where a.user_id = p.id order by a.created_at desc limit 1)) as locale,
            coalesce(nullif(trim(p.sex), ''), ${latestTraveler("sex")}) as sex,
            stats.purchases
     ${customerFrom}
     where ${where.join(" and ")}
     order by p.created_at desc
     limit $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    id: String(row.id),
    kind: "customer" as const,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    name: String(row.name),
    locale: (row.locale as string) ?? null,
    sex: normalizeSex(row.sex as string | null),
    purchases: num(row.purchases),
  }));
}

async function imported(q: Queryable, filter: AudienceFilter, limit: number): Promise<AudiencePerson[]> {
  const params: unknown[] = [];
  const where = [
    "c.unsubscribed_at is null",
    "(c.email is null or not exists (select 1 from profiles p where lower(p.email) = c.email))",
  ];
  if (filter.listIds.length) {
    params.push(filter.listIds);
    where.push(`exists (select 1 from marketing_list_members m where m.contact_id = c.id and m.list_id = any($${params.length}::uuid[]))`);
  }
  const pattern = likePattern(filter.query);
  if (pattern) {
    params.push(pattern);
    where.push(`(coalesce(c.email, '') ilike $${params.length} or coalesce(c.name, '') ilike $${params.length} or coalesce(c.phone, '') ilike $${params.length})`);
  }
  params.push(limit);
  const rows = await q.query<Row>(
    `select c.id, c.email, c.phone, c.name from marketing_contacts c
     where ${where.join(" and ")}
     order by c.created_at desc
     limit $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    id: String(row.id),
    kind: "imported" as const,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    name: (row.name as string) || (row.email as string) || (row.phone as string) || "",
    locale: null,
    sex: null,
    purchases: 0,
  }));
}

export function channelAddress(person: Pick<AudiencePerson, "email" | "phone">, channel: Channel) {
  if (channel === "email") return person.email ? person.email.toLowerCase() : null;
  return normalizePhone(person.phone);
}

export type ReachablePerson = AudiencePerson & { address: string };

/**
 * People who match the filter and can be reached on the channel. Suppressed addresses are left out.
 * `excluded` removes picked people; `only` keeps just the picked people.
 */
export async function resolveAudience(
  input: Partial<AudienceFilter>,
  options: { channel: Channel | null; excluded?: string[]; only?: string[]; q?: Queryable } = { channel: null },
) {
  const cleaned = cleanAudienceFilter(input);
  if (!cleaned.ok) return cleaned;
  const filter = cleaned.filter;
  const q = options.q ?? (await getDb());
  const people: AudiencePerson[] = [];
  if (filter.source !== "imported") people.push(...(await customers(q, filter, AUDIENCE_CAP + 1)));
  if (filter.source !== "customers") people.push(...(await imported(q, filter, AUDIENCE_CAP + 1)));
  const excluded = new Set(options.excluded ?? []);
  const only = options.only?.length ? new Set(options.only) : null;
  const seen = new Set<string>();
  const reachable: ReachablePerson[] = [];
  let unreachable = 0;
  for (const person of people) {
    if (excluded.has(person.id) || (only && !only.has(person.id))) continue;
    const address = options.channel ? channelAddress(person, options.channel) : person.email ?? normalizePhone(person.phone) ?? person.id;
    if (!address) {
      unreachable += 1;
      continue;
    }
    if (seen.has(address)) continue;
    seen.add(address);
    reachable.push({ ...person, address });
  }
  let suppressed = 0;
  let chosen = reachable;
  if (options.channel && reachable.length) {
    const rows = await q.query<{ address: string }>(
      "select address from marketing_suppressions where channel = $1 and address = any($2::text[])",
      [options.channel, reachable.map((person) => person.address)],
    );
    const blocked = new Set(rows.map((row) => row.address));
    chosen = reachable.filter((person) => !blocked.has(person.address));
    suppressed = reachable.length - chosen.length;
  }
  if (chosen.length > AUDIENCE_CAP) return { ok: false as const, error: `النتيجة أكبر من ${AUDIENCE_CAP} شخص. ضيّق الفلتر.` };
  return { ok: true as const, filter, people: chosen, unreachable, suppressed };
}

/** Whether one customer currently matches a saved filter. Used for coupons limited to a segment. */
export async function customerMatches(q: Queryable, input: Partial<AudienceFilter>, userId: string) {
  const cleaned = cleanAudienceFilter({ ...input, query: "" });
  if (!cleaned.ok) return false;
  if (cleaned.filter.source === "imported") return false;
  const params: unknown[] = [];
  const where = customerWhere(cleaned.filter, params);
  params.push(userId);
  const rows = await q.query(`select 1 as ok ${customerFrom} where ${where.join(" and ")} and p.id = $${params.length} limit 1`, params);
  return rows.length > 0;
}
