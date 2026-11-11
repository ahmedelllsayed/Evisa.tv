import "server-only";
import type { Db } from "@/lib/db/core";
import {
  couponCodeOk,
  couponError,
  couponWindowOpen,
  discountAmount,
  normalizeCouponCode,
  type CouponAppliesTo,
  type CouponDraft,
  type CouponKind,
  type CouponRecord,
  type CouponReject,
} from "@/lib/coupon-math";
import { getDb, isoOrNull, num, numOrNull, one, sql } from "./db";

type Row = Record<string, unknown>;
type Queryable = Pick<Db, "query">;

function dayStart(day: string | null) {
  return day ? `${day}T00:00:00.000Z` : null;
}

function dayEnd(day: string | null) {
  return day ? `${day}T23:59:59.999Z` : null;
}

function toCoupon(row: Row): CouponRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    kind: row.kind as CouponKind,
    value: num(row.value),
    appliesTo: row.applies_to as CouponAppliesTo,
    destinationId: (row.destination_id as string) ?? null,
    destinationName: (row.destination_name as string) ?? null,
    active: Boolean(row.active),
    startsAt: isoOrNull(row.starts_at),
    endsAt: isoOrNull(row.ends_at),
    maxUses: numOrNull(row.max_uses),
    usedCount: num(row.used_count),
    heldCount: num(row.held_count),
  };
}

export async function listCoupons() {
  const rows = await sql(
    `select c.*, d.name as destination_name,
            count(r.id) filter (where r.status = 'used')::int as used_count,
            count(r.id) filter (where r.status = 'held')::int as held_count
     from coupons c
     left join destinations d on d.id = c.destination_id
     left join coupon_redemptions r on r.coupon_id = c.id
     group by c.id, d.name
     order by c.created_at desc`,
  );
  return rows.map(toCoupon);
}

export function validateCouponDraft(input: CouponDraft): { ok: true; draft: CouponDraft } | { ok: false; error: string } {
  const code = normalizeCouponCode(input.code);
  if (!couponCodeOk(code)) return { ok: false, error: "الرمز من 3 إلى 20 حرفاً إنجليزياً أو رقماً." };
  if (input.kind !== "percent" && input.kind !== "fixed") return { ok: false, error: "اختر نسبة أو مبلغاً ثابتاً." };
  if (input.appliesTo !== "service" && input.appliesTo !== "total") return { ok: false, error: "اختر رسم الخدمة أو الإجمالي." };
  const value = input.kind === "percent" ? Math.round(input.value) : Math.round(input.value);
  if (input.kind === "percent" && (value < 1 || value > 100)) return { ok: false, error: "النسبة من 1 إلى 100." };
  if (input.kind === "fixed" && value < 1) return { ok: false, error: "المبلغ الثابت يجب أن يكون جنيهاً على الأقل." };
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) {
    return { ok: false, error: "حد الاستخدام رقم صحيح أكبر من صفر، أو فارغ بلا حد." };
  }
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) return { ok: false, error: "تاريخ النهاية قبل البداية." };
  return {
    ok: true,
    draft: { ...input, code, value, destinationId: input.destinationId || null, maxUses: input.maxUses },
  };
}

export async function saveCoupon(input: CouponDraft) {
  const checked = validateCouponDraft(input);
  if (!checked.ok) return checked;
  const draft = checked.draft;
  const params = [
    draft.code,
    draft.kind,
    draft.value,
    draft.appliesTo,
    draft.destinationId,
    draft.active,
    dayStart(draft.startsOn),
    dayEnd(draft.endsOn),
    draft.maxUses,
  ];
  try {
    if (draft.id) {
      const row = await one(
        `update coupons set code=$2, kind=$3, value=$4, applies_to=$5, destination_id=$6, active=$7,
           starts_at=$8::timestamptz, ends_at=$9::timestamptz, max_uses=$10, updated_at=now()
         where id=$1 returning id`,
        [draft.id, ...params],
      );
      if (!row) return { ok: false as const, error: "الكوبون غير موجود." };
    } else {
      await sql(
        `insert into coupons (code, kind, value, applies_to, destination_id, active, starts_at, ends_at, max_uses)
         values ($1,$2,$3,$4,$5,$6,$7::timestamptz,$8::timestamptz,$9)`,
        params,
      );
    }
  } catch (error) {
    const text = String(error);
    if (text.includes("23505") || text.includes("duplicate") || text.includes("unique")) {
      return { ok: false as const, error: "هذا الرمز مستخدم لكوبون آخر." };
    }
    throw error;
  }
  return { ok: true as const };
}

export async function setCouponActive(id: string, active: boolean) {
  await sql("update coupons set active = $2, updated_at = now() where id = $1", [id, active]);
}

export async function deleteCoupon(id: string) {
  const removed = await sql("delete from coupons where id = $1 returning id", [id]);
  if (!removed.length) return { ok: false as const, error: "الكوبون غير موجود." };
  return { ok: true as const };
}

async function couponReject(
  tx: Queryable,
  coupon: Row,
  application: { id: string; destinationId: string; userId: string },
  now: Date,
): Promise<CouponReject | null> {
  const window = couponWindowOpen(
    { active: Boolean(coupon.active), startsAt: coupon.starts_at ? new Date(String(coupon.starts_at)) : null, endsAt: coupon.ends_at ? new Date(String(coupon.ends_at)) : null },
    now,
  );
  if (window) return window;
  if (coupon.destination_id && String(coupon.destination_id) !== application.destinationId) return "destination";
  const [counts] = await tx.query<{ uses: number; mine: number }>(
    `select count(*) filter (where status in ('held', 'used') and application_id <> $2)::int as uses,
            count(*) filter (where status in ('held', 'used') and user_id = $3 and application_id <> $2)::int as mine
     from coupon_redemptions where coupon_id = $1`,
    [coupon.id, application.id, application.userId],
  );
  const maxUses = numOrNull(coupon.max_uses);
  if (maxUses != null && num(counts?.uses) >= maxUses) return "used_up";
  if (num(counts?.mine) > 0) return "used_by_you";
  return null;
}

export async function repriceWithCoupon(tx: Queryable, applicationId: string) {
  const [app] = await tx.query<Row>("select gov_fee, service_fee, coupon_id, destination_id, paid_at, price_locked_at from applications where id = $1 for update", [
    applicationId,
  ]);
  if (!app || app.paid_at || app.price_locked_at) return;
  const gov = num(app.gov_fee);
  const service = num(app.service_fee);
  if (!app.coupon_id) {
    await tx.query("update applications set discount_amount = 0, total_amount = $2, updated_at = now() where id = $1", [applicationId, gov + service]);
    return;
  }
  const [coupon] = await tx.query<Row>("select * from coupons where id = $1", [app.coupon_id]);
  const closed = !coupon
    || couponWindowOpen(
      { active: Boolean(coupon.active), startsAt: coupon.starts_at ? new Date(String(coupon.starts_at)) : null, endsAt: coupon.ends_at ? new Date(String(coupon.ends_at)) : null },
      new Date(),
    )
    || (coupon.destination_id && String(coupon.destination_id) !== String(app.destination_id));
  if (closed) {
    await tx.query("update applications set coupon_id = null, discount_amount = 0, total_amount = $2, updated_at = now() where id = $1", [applicationId, gov + service]);
    await tx.query("update coupon_redemptions set status = 'released', updated_at = now() where application_id = $1 and status = 'held'", [applicationId]);
    return;
  }
  const discount = discountAmount(
    { govFee: gov, serviceFee: service },
    { kind: coupon.kind as CouponKind, value: num(coupon.value), appliesTo: coupon.applies_to as CouponAppliesTo },
  );
  await tx.query("update applications set discount_amount = $2, total_amount = $3, updated_at = now() where id = $1", [
    applicationId,
    discount,
    gov + service - discount,
  ]);
}

export async function repriceApplication(applicationId: string) {
  const db = await getDb();
  await db.transaction((tx) => repriceWithCoupon(tx, applicationId));
}

async function failOpenPayments(tx: Queryable, applicationId: string) {
  await tx.query(
    "update payments set status = 'failed', processed_at = now() where application_id = $1 and status = 'pending'",
    [applicationId],
  );
  await tx.query("update coupon_redemptions set status = 'released', updated_at = now() where application_id = $1 and status = 'held'", [applicationId]);
}

export async function applyCouponToApplication(applicationId: string, userId: string, rawCode: string, locale: string) {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false as const, error: couponError(locale, "empty") };
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [app] = await tx.query<Row>("select id, user_id, destination_id, status, paid_at from applications where id = $1 for update", [applicationId]);
    if (!app || String(app.user_id) !== userId) return { ok: false as const, error: couponError(locale, "missing") };
    if (app.paid_at || (app.status !== "draft" && app.status !== "payment_pending")) {
      return { ok: false as const, error: locale.toLowerCase().startsWith("ar") ? "لا يمكن تعديل خصم طلب مدفوع." : "A paid application cannot change its discount." };
    }
    const [coupon] = await tx.query<Row>("select * from coupons where upper(code) = $1 for update", [code]);
    if (!coupon) return { ok: false as const, error: couponError(locale, "missing") };
    const reason = await couponReject(tx, coupon, { id: applicationId, destinationId: String(app.destination_id), userId }, new Date());
    if (reason) return { ok: false as const, error: couponError(locale, reason) };
    await failOpenPayments(tx, applicationId);
    await tx.query("update applications set coupon_id = $2, updated_at = now() where id = $1", [applicationId, coupon.id]);
    await repriceWithCoupon(tx, applicationId);
    return { ok: true as const };
  });
}

export async function clearCouponFromApplication(applicationId: string, userId: string, locale: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [app] = await tx.query<Row>("select user_id, status, paid_at, gov_fee, service_fee from applications where id = $1 for update", [applicationId]);
    if (!app || String(app.user_id) !== userId) return { ok: false as const, error: couponError(locale, "missing") };
    if (app.paid_at || (app.status !== "draft" && app.status !== "payment_pending")) {
      return { ok: false as const, error: locale.toLowerCase().startsWith("ar") ? "لا يمكن تعديل خصم طلب مدفوع." : "A paid application cannot change its discount." };
    }
    await failOpenPayments(tx, applicationId);
    const total = num(app.gov_fee) + num(app.service_fee);
    await tx.query("update applications set coupon_id = null, discount_amount = 0, total_amount = $2, updated_at = now() where id = $1", [applicationId, total]);
    return { ok: true as const };
  });
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
    `insert into coupon_redemptions (coupon_id, application_id, user_id, status, amount)
     select coupon_id, id, user_id, 'used', discount_amount from applications
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
    const [app] = await tx.query<Row>("select id, user_id, destination_id, coupon_id, discount_amount, status, paid_at from applications where id = $1 for update", [
      applicationId,
    ]);
    if (!app) return { ok: false as const, error: couponError(locale, "missing") };
    if (before?.coupon_id && !app.coupon_id) return { ok: false as const, error: couponError(locale, "expired") };
    if (!app.coupon_id) return { ok: true as const };
    const [coupon] = await tx.query<Row>("select * from coupons where id = $1 for update", [app.coupon_id]);
    if (!coupon) return { ok: false as const, error: couponError(locale, "missing") };
    const reason = await couponReject(tx, coupon, { id: applicationId, destinationId: String(app.destination_id), userId: String(app.user_id) }, new Date());
    if (reason) {
      const govService = await tx.query<Row>("select gov_fee, service_fee from applications where id = $1", [applicationId]);
      const total = num(govService[0]?.gov_fee) + num(govService[0]?.service_fee);
      await tx.query("update applications set coupon_id = null, discount_amount = 0, total_amount = $2, updated_at = now() where id = $1", [applicationId, total]);
      return { ok: false as const, error: couponError(locale, reason) };
    }
    await tx.query(
      `insert into coupon_redemptions (coupon_id, application_id, user_id, status, amount)
       values ($1,$2,$3,'held',$4)
       on conflict (application_id) do update
       set coupon_id = excluded.coupon_id, user_id = excluded.user_id, status = 'held', amount = excluded.amount, updated_at = now()`,
      [coupon.id, applicationId, app.user_id, num(app.discount_amount)],
    );
    return { ok: true as const };
  });
}
