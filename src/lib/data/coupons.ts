import "server-only";
import { randomInt } from "node:crypto";
import type { Db } from "@/lib/db/core";
import {
  couponCodeOk,
  couponError,
  couponFits,
  couponWindowOpen,
  discountAmount,
  marketBound,
  marketDay,
  normalizeCouponCode,
  type CouponAppliesTo,
  type CouponDraft,
  type CouponKind,
  type CouponRecord,
  type CouponReject,
} from "@/lib/coupon-math";
import { customerMatches } from "./marketing/audience";
import { getDb, iso, isoOrNull, json, num, numOrNull, one, sql } from "./db";

type Row = Record<string, unknown>;
type Queryable = Pick<Db, "query">;

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const uuidPattern = /^[0-9a-f-]{36}$/i;

function dayStart(day: string | null) {
  return day ? marketBound(day, "start") : null;
}

function dayEnd(day: string | null) {
  return day ? marketBound(day, "end") : null;
}

function idList(value: unknown) {
  return json<unknown[]>(value, []).map(String).filter(Boolean);
}

function toCoupon(row: Row): CouponRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    name: (row.name as string) ?? null,
    kind: row.kind as CouponKind,
    value: num(row.value),
    appliesTo: row.applies_to as CouponAppliesTo,
    destinationIds: idList(row.destination_ids),
    visaTypes: idList(row.visa_types),
    minTotal: numOrNull(row.min_total),
    maxDiscount: numOrNull(row.max_discount),
    perCustomer: Math.max(1, num(row.per_customer) || 1),
    firstOrderOnly: Boolean(row.first_order_only),
    segmentId: (row.segment_id as string) ?? null,
    segmentName: (row.segment_name as string) ?? null,
    active: Boolean(row.active),
    startsAt: row.starts_at ? marketDay(new Date(String(row.starts_at))) : null,
    endsAt: row.ends_at ? marketDay(new Date(String(row.ends_at))) : null,
    maxUses: numOrNull(row.max_uses),
    usedCount: num(row.used_count),
    heldCount: num(row.held_count),
    discountTotal: num(row.discount_total),
    codeCount: num(row.code_count),
    codeUsed: num(row.code_used),
    system: (row.system as string) ?? null,
  };
}

const COUPON_SELECT = `
  select c.*, s.name as segment_name,
         (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status = 'used') as used_count,
         (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status = 'held') as held_count,
         (select coalesce(sum(r.amount), 0) from coupon_redemptions r where r.coupon_id = c.id and r.status = 'used') as discount_total,
         (select count(*)::int from coupon_codes k where k.coupon_id = c.id) as code_count,
         (select count(distinct r.code_id)::int from coupon_redemptions r join coupon_codes k on k.id = r.code_id
           where k.coupon_id = c.id and r.status = 'used') as code_used
  from coupons c
  left join marketing_segments s on s.id = c.segment_id`;

export async function listCoupons(opts: { includeSystem?: boolean } = {}) {
  const rows = await sql(`${COUPON_SELECT} ${opts.includeSystem ? "" : "where c.system is null"} order by c.created_at desc`);
  return rows.map(toCoupon);
}

export async function getCoupon(id: string) {
  if (!uuidPattern.test(id)) return null;
  const row = await one(`${COUPON_SELECT} where c.id = $1`, [id]);
  return row ? toCoupon(row) : null;
}

export function validateCouponDraft(input: CouponDraft): { ok: true; draft: CouponDraft } | { ok: false; error: string } {
  const code = normalizeCouponCode(input.code);
  if (!couponCodeOk(code)) return { ok: false, error: "الرمز من 3 إلى 20 حرفاً إنجليزياً أو رقماً." };
  if (input.kind !== "percent" && input.kind !== "fixed") return { ok: false, error: "اختر نسبة أو مبلغاً ثابتاً." };
  if (input.appliesTo !== "service" && input.appliesTo !== "total") return { ok: false, error: "اختر رسم الخدمة أو الإجمالي." };
  const value = Math.round(Number(input.value));
  if (input.kind === "percent" && (value < 1 || value > 100)) return { ok: false, error: "النسبة من 1 إلى 100." };
  if (input.kind === "fixed" && value < 1) return { ok: false, error: "المبلغ الثابت يجب أن يكون جنيهاً على الأقل." };
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) {
    return { ok: false, error: "حد الاستخدام رقم صحيح أكبر من صفر، أو فارغ بلا حد." };
  }
  const perCustomer = Math.round(Number(input.perCustomer || 1));
  if (!Number.isInteger(perCustomer) || perCustomer < 1 || perCustomer > 100) return { ok: false, error: "مرات الاستخدام لكل عميل من 1 إلى 100." };
  const minTotal = input.minTotal == null || Number(input.minTotal) <= 0 ? null : Math.round(Number(input.minTotal));
  const maxDiscount = input.maxDiscount == null || Number(input.maxDiscount) <= 0 ? null : Math.round(Number(input.maxDiscount));
  if ((minTotal != null && !Number.isFinite(minTotal)) || (maxDiscount != null && !Number.isFinite(maxDiscount))) {
    return { ok: false, error: "الحد الأدنى وسقف الخصم أرقام." };
  }
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) return { ok: false, error: "تاريخ النهاية قبل البداية." };
  const segmentId = input.segmentId && uuidPattern.test(input.segmentId) ? input.segmentId : null;
  return {
    ok: true,
    draft: {
      ...input,
      code,
      name: input.name?.trim().slice(0, 80) || null,
      value,
      destinationIds: [...new Set((input.destinationIds ?? []).filter((id) => uuidPattern.test(id)))],
      visaTypes: [...new Set((input.visaTypes ?? []).filter((type) => /^[a-z-]{2,20}$/.test(type)))],
      minTotal,
      maxDiscount: input.kind === "percent" ? maxDiscount : null,
      perCustomer,
      segmentId,
      maxUses: input.maxUses,
    },
  };
}

async function codeTaken(q: Queryable, code: string, exceptCouponId: string | null) {
  const rows = await q.query(
    `select 1 as taken from coupons where upper(code) = $1 and ($2::uuid is null or id <> $2::uuid)
     union all select 1 from coupon_codes where code = $1 limit 1`,
    [code, exceptCouponId],
  );
  return rows.length > 0;
}

export async function saveCoupon(input: CouponDraft, system: string | null = null) {
  const checked = validateCouponDraft(input);
  if (!checked.ok) return checked;
  const draft = checked.draft;
  const db = await getDb();
  if (await codeTaken(db, draft.code, draft.id ?? null)) return { ok: false as const, error: "هذا الرمز مستخدم لكوبون آخر." };
  const params = [
    draft.code,
    draft.kind,
    draft.value,
    draft.appliesTo,
    draft.active,
    dayStart(draft.startsOn),
    dayEnd(draft.endsOn),
    draft.maxUses,
    draft.name,
    JSON.stringify(draft.destinationIds),
    JSON.stringify(draft.visaTypes),
    draft.minTotal,
    draft.maxDiscount,
    draft.perCustomer,
    draft.firstOrderOnly,
    draft.segmentId,
  ];
  try {
    if (draft.id) {
      const row = await one<{ id: string }>(
        `update coupons set code=$2, kind=$3, value=$4, applies_to=$5, active=$6, starts_at=$7::timestamptz, ends_at=$8::timestamptz,
           max_uses=$9, name=$10, destination_ids=$11::jsonb, visa_types=$12::jsonb, min_total=$13, max_discount=$14,
           per_customer=$15, first_order_only=$16, segment_id=$17, updated_at=now()
         where id=$1 returning id`,
        [draft.id, ...params],
      );
      if (!row) return { ok: false as const, error: "الكوبون غير موجود." };
      return { ok: true as const, id: row.id };
    }
    const row = await one<{ id: string }>(
      `insert into coupons (code, kind, value, applies_to, active, starts_at, ends_at, max_uses, name, destination_ids, visa_types,
         min_total, max_discount, per_customer, first_order_only, segment_id, system)
       values ($1,$2,$3,$4,$5,$6::timestamptz,$7::timestamptz,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17) returning id`,
      [...params, system],
    );
    return { ok: true as const, id: row!.id };
  } catch (error) {
    const text = String(error);
    if (text.includes("23505") || text.includes("duplicate") || text.includes("unique")) {
      return { ok: false as const, error: "هذا الرمز مستخدم لكوبون آخر." };
    }
    throw error;
  }
}

export async function setCouponActive(id: string, active: boolean) {
  await sql("update coupons set active = $2, updated_at = now() where id = $1", [id, active]);
}

export async function deleteCoupon(id: string) {
  const removed = await sql("delete from coupons where id = $1 and system is null returning id", [id]);
  if (!removed.length) return { ok: false as const, error: "الكوبون غير موجود." };
  return { ok: true as const };
}

export async function duplicateCoupon(id: string) {
  const coupon = await getCoupon(id);
  if (!coupon || coupon.system) return { ok: false as const, error: "الكوبون غير موجود." };
  const db = await getDb();
  let code = "";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${coupon.code.slice(0, 14)}-${randomCode(4)}`;
    if (!(await codeTaken(db, candidate, null))) {
      code = candidate;
      break;
    }
  }
  if (!code) return { ok: false as const, error: "تعذر توليد رمز جديد. أعد المحاولة." };
  return saveCoupon({
    code,
    name: coupon.name ? `${coupon.name} (نسخة)` : null,
    kind: coupon.kind,
    value: coupon.value,
    appliesTo: coupon.appliesTo,
    destinationIds: coupon.destinationIds,
    visaTypes: coupon.visaTypes,
    minTotal: coupon.minTotal,
    maxDiscount: coupon.maxDiscount,
    perCustomer: coupon.perCustomer,
    firstOrderOnly: coupon.firstOrderOnly,
    segmentId: coupon.segmentId,
    active: false,
    startsOn: coupon.startsAt,
    endsOn: coupon.endsAt,
    maxUses: coupon.maxUses,
  });
}

function randomCode(length: number) {
  return Array.from({ length }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join("");
}

/** Single-use codes under one coupon. Each code can be paid with once, by anyone or by the assigned customer. */
export async function generateCouponCodes(
  q: Queryable,
  couponId: string,
  count: number,
  options: { prefix?: string | null; userId?: string | null; email?: string | null; campaignId?: string | null; expiresAt?: string | null } = {},
) {
  const prefix = normalizeCouponCode(options.prefix ?? "").replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const codes: { id: string; code: string }[] = [];
  let misses = 0;
  while (codes.length < count && misses < count * 5 + 20) {
    const code = prefix ? `${prefix}-${randomCode(6)}` : randomCode(8);
    if (await codeTaken(q, code, null)) {
      misses += 1;
      continue;
    }
    const rows = await q.query<{ id: string }>(
      `insert into coupon_codes (coupon_id, code, user_id, email, campaign_id, expires_at)
       values ($1,$2,$3,$4,$5,$6::timestamptz)
       on conflict (code) do nothing returning id`,
      [couponId, code, options.userId ?? null, options.email ?? null, options.campaignId ?? null, options.expiresAt ?? null],
    );
    if (rows[0]) codes.push({ id: rows[0].id, code });
    else misses += 1;
  }
  return codes;
}

export async function createCouponCodeBatch(couponId: string, count: number, prefix: string | null) {
  const coupon = await getCoupon(couponId);
  if (!coupon || coupon.system) return { ok: false as const, error: "الكوبون غير موجود." };
  const amount = Math.round(Number(count));
  if (!Number.isInteger(amount) || amount < 1 || amount > 1000) return { ok: false as const, error: "عدد الرموز من 1 إلى 1000." };
  const db = await getDb();
  const codes = await db.transaction((tx) => generateCouponCodes(tx, couponId, amount, { prefix }));
  return { ok: true as const, count: codes.length };
}

export type CouponCodeRow = {
  id: string;
  code: string;
  email: string | null;
  userEmail: string | null;
  expiresAt: string | null;
  cancelled: boolean;
  usedAt: string | null;
  createdAt: string;
};

export async function listCouponCodes(couponId: string, limit = 200): Promise<CouponCodeRow[]> {
  const rows = await sql(
    `select k.id, k.code, k.email, p.email as user_email, k.expires_at, k.cancelled_at, k.created_at,
            (select max(r.updated_at) from coupon_redemptions r where r.code_id = k.id and r.status = 'used') as used_at
     from coupon_codes k
     left join profiles p on p.id = k.user_id
     where k.coupon_id = $1
     order by k.created_at desc
     limit $2`,
    [couponId, limit],
  );
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.code),
    email: (row.email as string) ?? null,
    userEmail: (row.user_email as string) ?? null,
    expiresAt: isoOrNull(row.expires_at),
    cancelled: Boolean(row.cancelled_at),
    usedAt: isoOrNull(row.used_at),
    createdAt: iso(row.created_at),
  }));
}

export type CouponUseRow = {
  applicationId: string;
  reference: string;
  email: string | null;
  code: string | null;
  amount: number;
  total: number;
  status: "held" | "used" | "released";
  at: string;
};

export async function listCouponUses(couponId: string, limit = 500): Promise<CouponUseRow[]> {
  const rows = await sql(
    `select r.application_id, a.reference, p.email, k.code, r.amount, a.total_amount, r.status, r.updated_at
     from coupon_redemptions r
     join applications a on a.id = r.application_id
     left join profiles p on p.id = r.user_id
     left join coupon_codes k on k.id = r.code_id
     where r.coupon_id = $1
     order by r.updated_at desc
     limit $2`,
    [couponId, limit],
  );
  return rows.map((row) => ({
    applicationId: String(row.application_id),
    reference: String(row.reference),
    email: (row.email as string) ?? null,
    code: (row.code as string) ?? null,
    amount: num(row.amount),
    total: num(row.total_amount),
    status: String(row.status) as CouponUseRow["status"],
    at: iso(row.updated_at),
  }));
}

type OrderContext = { id: string; destinationId: string; userId: string; visaType: string | null; total: number };

async function orderContext(tx: Queryable, applicationId: string): Promise<(OrderContext & { app: Row }) | null> {
  const [app] = await tx.query<Row>(
    `select a.id, a.user_id, a.destination_id, a.status, a.paid_at, a.price_locked_at, a.gov_fee, a.service_fee,
            a.coupon_id, a.coupon_code_id, a.discount_amount,
            coalesce(nullif(a.visa_details->>'visaType', ''), vo.visa_type, d.visa_type) as visa_type
     from applications a
     join destinations d on d.id = a.destination_id
     left join visa_options vo on vo.id = a.visa_option_id
     where a.id = $1 for update of a`,
    [applicationId],
  );
  if (!app) return null;
  return {
    app,
    id: String(app.id),
    destinationId: String(app.destination_id),
    userId: String(app.user_id),
    visaType: (app.visa_type as string) ?? null,
    total: num(app.gov_fee) + num(app.service_fee),
  };
}

function conditionsOf(coupon: Row) {
  return { destinationIds: idList(coupon.destination_ids), visaTypes: idList(coupon.visa_types), minTotal: numOrNull(coupon.min_total) };
}

function windowOf(coupon: Row, now: Date) {
  return couponWindowOpen(
    {
      active: Boolean(coupon.active),
      startsAt: coupon.starts_at ? new Date(String(coupon.starts_at)) : null,
      endsAt: coupon.ends_at ? new Date(String(coupon.ends_at)) : null,
    },
    now,
  );
}

function codeClosed(code: Row | null, now: Date): CouponReject | null {
  if (!code) return null;
  if (code.cancelled_at) return "inactive";
  if (code.expires_at && new Date(String(code.expires_at)).getTime() < now.getTime()) return "expired";
  return null;
}

async function couponReject(tx: Queryable, coupon: Row, code: Row | null, order: OrderContext, now: Date): Promise<CouponReject | null> {
  const window = windowOf(coupon, now) ?? codeClosed(code, now);
  if (window) return window;
  if (code?.user_id && String(code.user_id) !== order.userId) return "not_yours";
  const fits = couponFits(conditionsOf(coupon), order);
  if (fits) return fits;
  const [counts] = await tx.query<{ uses: number; mine: number; code_uses: number }>(
    `select count(*) filter (where status in ('held', 'used') and application_id <> $2)::int as uses,
            count(*) filter (where status in ('held', 'used') and user_id = $3 and application_id <> $2)::int as mine,
            count(*) filter (where status in ('held', 'used') and application_id <> $2 and code_id = $4::uuid)::int as code_uses
     from coupon_redemptions where coupon_id = $1`,
    [coupon.id, order.id, order.userId, code?.id ?? null],
  );
  const maxUses = numOrNull(coupon.max_uses);
  if (maxUses != null && num(counts?.uses) >= maxUses) return "used_up";
  if (code && num(counts?.code_uses) > 0) return "used_up";
  if (num(counts?.mine) >= Math.max(1, num(coupon.per_customer) || 1)) return "used_by_you";
  if (coupon.first_order_only) {
    const paid = await tx.query("select 1 as paid from applications where user_id = $1 and paid_at is not null and id <> $2 limit 1", [order.userId, order.id]);
    if (paid.length) return "first_order";
  }
  if (coupon.system === "referral_friend") {
    const referred = await tx.query("select 1 as ok from profiles where id = $1 and referred_by is not null", [order.userId]);
    if (!referred.length) return "not_yours";
  }
  if (coupon.segment_id) {
    const [segment] = await tx.query<{ filter: unknown }>("select filter from marketing_segments where id = $1", [coupon.segment_id]);
    if (!segment || !(await customerMatches(tx, json(segment.filter, {}), order.userId))) return "not_yours";
  }
  return null;
}

async function resetPrice(tx: Queryable, applicationId: string, total: number) {
  await tx.query(
    "update applications set coupon_id = null, coupon_code_id = null, discount_amount = 0, total_amount = $2, updated_at = now() where id = $1",
    [applicationId, total],
  );
}

export async function repriceWithCoupon(tx: Queryable, applicationId: string) {
  const order = await orderContext(tx, applicationId);
  if (!order || order.app.paid_at || order.app.price_locked_at) return;
  const gov = num(order.app.gov_fee);
  const service = num(order.app.service_fee);
  if (!order.app.coupon_id) {
    await tx.query("update applications set discount_amount = 0, total_amount = $2, updated_at = now() where id = $1", [applicationId, gov + service]);
    return;
  }
  const [coupon] = await tx.query<Row>("select * from coupons where id = $1", [order.app.coupon_id]);
  const [code] = order.app.coupon_code_id ? await tx.query<Row>("select * from coupon_codes where id = $1", [order.app.coupon_code_id]) : [];
  const now = new Date();
  const closed = !coupon || windowOf(coupon, now) || codeClosed(code ?? null, now) || couponFits(conditionsOf(coupon), order);
  if (closed) {
    await resetPrice(tx, applicationId, gov + service);
    await tx.query("update coupon_redemptions set status = 'released', updated_at = now() where application_id = $1 and status = 'held'", [applicationId]);
    return;
  }
  const discount = discountAmount(
    { govFee: gov, serviceFee: service },
    { kind: coupon.kind as CouponKind, value: num(coupon.value), appliesTo: coupon.applies_to as CouponAppliesTo, maxDiscount: numOrNull(coupon.max_discount) },
  );
  await tx.query("update applications set discount_amount = $2, total_amount = $3, updated_at = now() where id = $1", [applicationId, discount, gov + service - discount]);
}

export async function repriceApplication(applicationId: string) {
  const db = await getDb();
  await db.transaction((tx) => repriceWithCoupon(tx, applicationId));
}

async function failOpenPayments(tx: Queryable, applicationId: string) {
  await tx.query("update payments set status = 'failed', processed_at = now() where application_id = $1 and status = 'pending'", [applicationId]);
  await tx.query("update coupon_redemptions set status = 'released', updated_at = now() where application_id = $1 and status = 'held'", [applicationId]);
}

async function findCode(tx: Queryable, code: string) {
  const [coupon] = await tx.query<Row>("select * from coupons where upper(code) = $1 for update", [code]);
  if (coupon) return { coupon, code: null as Row | null };
  const [child] = await tx.query<Row>("select * from coupon_codes where code = $1 for update", [code]);
  if (!child) return null;
  const [parent] = await tx.query<Row>("select * from coupons where id = $1 for update", [child.coupon_id]);
  return parent ? { coupon: parent, code: child } : null;
}

function paidMessage(locale: string) {
  return locale.toLowerCase().startsWith("ar") ? "لا يمكن تعديل خصم طلب مدفوع." : "A paid application cannot change its discount.";
}

export async function applyCouponToApplication(applicationId: string, userId: string, rawCode: string, locale: string) {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false as const, error: couponError(locale, "empty") };
  const db = await getDb();
  return db.transaction(async (tx) => {
    const order = await orderContext(tx, applicationId);
    if (!order || order.userId !== userId) return { ok: false as const, error: couponError(locale, "missing") };
    if (order.app.paid_at || (order.app.status !== "draft" && order.app.status !== "payment_pending")) {
      return { ok: false as const, error: paidMessage(locale) };
    }
    const found = await findCode(tx, code);
    if (!found) return { ok: false as const, error: couponError(locale, "missing") };
    const reason = await couponReject(tx, found.coupon, found.code, order, new Date());
    if (reason) return { ok: false as const, error: couponError(locale, reason) };
    await failOpenPayments(tx, applicationId);
    await tx.query("update applications set coupon_id = $2, coupon_code_id = $3, updated_at = now() where id = $1", [
      applicationId,
      found.coupon.id,
      found.code?.id ?? null,
    ]);
    await repriceWithCoupon(tx, applicationId);
    return { ok: true as const };
  });
}

export async function clearCouponFromApplication(applicationId: string, userId: string, locale: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [app] = await tx.query<Row>("select user_id, status, paid_at, gov_fee, service_fee from applications where id = $1 for update", [applicationId]);
    if (!app || String(app.user_id) !== userId) return { ok: false as const, error: couponError(locale, "missing") };
    if (app.paid_at || (app.status !== "draft" && app.status !== "payment_pending")) return { ok: false as const, error: paidMessage(locale) };
    await failOpenPayments(tx, applicationId);
    await resetPrice(tx, applicationId, num(app.gov_fee) + num(app.service_fee));
    return { ok: true as const };
  });
}

/**
 * Tries a coupon from a marketing link, then the referral discount, once per application.
 * A failure is silent: the customer can still type a code.
 */
export async function autoApplyCoupon(applicationId: string, userId: string, linkCode: string | null, locale: string) {
  const claimed = await sql(
    `update applications set coupon_auto_at = now()
     where id = $1 and user_id = $2 and coupon_auto_at is null and coupon_id is null and paid_at is null
       and status in ('draft', 'payment_pending')
     returning id`,
    [applicationId, userId],
  );
  if (!claimed.length) return false;
  if (linkCode) {
    const result = await applyCouponToApplication(applicationId, userId, linkCode, locale);
    if (result.ok) return true;
  }
  const friend = await one<{ code: string }>(
    `select c.code from coupons c
     join profiles p on p.id = $1 and p.referred_by is not null
     where c.system = 'referral_friend' and c.active
     limit 1`,
    [userId],
  );
  if (!friend) return false;
  const result = await applyCouponToApplication(applicationId, userId, friend.code, locale);
  return result.ok;
}

export async function releaseCouponHold(applicationId: string) {
  await sql("update coupon_redemptions set status = 'released', updated_at = now() where application_id = $1 and status = 'held'", [applicationId]);
}

export async function consumeCoupon(tx: Queryable, applicationId: string) {
  await tx.query(
    "update coupon_redemptions set status = 'used', updated_at = now() where application_id = $1 and status in ('held', 'released')",
    [applicationId],
  );
  await tx.query(
    `insert into coupon_redemptions (coupon_id, application_id, user_id, status, amount, code_id)
     select coupon_id, id, user_id, 'used', discount_amount, coupon_code_id from applications
     where id = $1 and coupon_id is not null
       and not exists (select 1 from coupon_redemptions where application_id = $1 and status in ('held', 'used'))`,
    [applicationId],
  );
}

export async function prepareCouponCheckout(applicationId: string, locale: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [before] = await tx.query<Row>("select coupon_id from applications where id = $1", [applicationId]);
    await repriceWithCoupon(tx, applicationId);
    const order = await orderContext(tx, applicationId);
    if (!order) return { ok: false as const, error: couponError(locale, "missing") };
    if (before?.coupon_id && !order.app.coupon_id) return { ok: false as const, error: couponError(locale, "expired") };
    if (!order.app.coupon_id) return { ok: true as const };
    const [coupon] = await tx.query<Row>("select * from coupons where id = $1 for update", [order.app.coupon_id]);
    if (!coupon) return { ok: false as const, error: couponError(locale, "missing") };
    const [code] = order.app.coupon_code_id ? await tx.query<Row>("select * from coupon_codes where id = $1 for update", [order.app.coupon_code_id]) : [];
    const reason = await couponReject(tx, coupon, code ?? null, order, new Date());
    if (reason) {
      await resetPrice(tx, applicationId, order.total);
      return { ok: false as const, error: couponError(locale, reason) };
    }
    await tx.query(
      `insert into coupon_redemptions (coupon_id, application_id, user_id, status, amount, code_id)
       values ($1,$2,$3,'held',$4,$5)
       on conflict (application_id) do update
       set coupon_id = excluded.coupon_id, user_id = excluded.user_id, status = 'held', amount = excluded.amount,
           code_id = excluded.code_id, updated_at = now()`,
      [coupon.id, applicationId, order.userId, num(order.app.discount_amount), code?.id ?? null],
    );
    return { ok: true as const };
  });
}
