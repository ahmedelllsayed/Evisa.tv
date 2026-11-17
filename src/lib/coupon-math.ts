export type CouponKind = "percent" | "fixed";
export type CouponAppliesTo = "service" | "total";

export type CouponRule = {
  kind: CouponKind;
  value: number;
  appliesTo: CouponAppliesTo;
  maxDiscount?: number | null;
};

export type CouponReject =
  | "missing"
  | "inactive"
  | "early"
  | "expired"
  | "destination"
  | "minimum"
  | "used_up"
  | "used_by_you"
  | "first_order"
  | "not_yours"
  | "empty";

export type CouponDraft = {
  id?: string | null;
  code: string;
  name: string | null;
  kind: CouponKind;
  value: number;
  appliesTo: CouponAppliesTo;
  destinationIds: string[];
  visaTypes: string[];
  minTotal: number | null;
  maxDiscount: number | null;
  perCustomer: number;
  firstOrderOnly: boolean;
  segmentId: string | null;
  active: boolean;
  startsOn: string | null;
  endsOn: string | null;
  maxUses: number | null;
};

export type CouponRecord = {
  id: string;
  code: string;
  name: string | null;
  kind: CouponKind;
  value: number;
  appliesTo: CouponAppliesTo;
  destinationIds: string[];
  visaTypes: string[];
  minTotal: number | null;
  maxDiscount: number | null;
  perCustomer: number;
  firstOrderOnly: boolean;
  segmentId: string | null;
  segmentName: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  heldCount: number;
  discountTotal: number;
  codeCount: number;
  codeUsed: number;
  system: string | null;
};

export type CouponConditions = {
  destinationIds: string[];
  visaTypes: string[];
  minTotal: number | null;
};

export function normalizeCouponCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function couponCodeOk(code: string) {
  return /^[A-Z0-9][A-Z0-9-]{2,19}$/.test(code);
}

/** Discount in whole currency units. It never exceeds the chosen base, the optional cap, or the total. */
export function discountAmount(fees: { govFee: number; serviceFee: number }, coupon: CouponRule) {
  const gov = Math.max(0, fees.govFee);
  const service = Math.max(0, fees.serviceFee);
  const total = gov + service;
  const base = coupon.appliesTo === "service" ? service : total;
  if (base <= 0 || !(coupon.value > 0)) return 0;
  const raw = coupon.kind === "percent" ? (base * coupon.value) / 100 : coupon.value;
  const cap = coupon.maxDiscount != null && coupon.maxDiscount > 0 ? coupon.maxDiscount : Number.POSITIVE_INFINITY;
  return Math.min(base, cap, Math.max(0, Math.round(raw)));
}

/** Conditions that depend only on the application, checked again whenever the price changes. */
export function couponFits(conditions: CouponConditions, order: { destinationId: string; visaType: string | null; total: number }): CouponReject | null {
  if (conditions.destinationIds.length && !conditions.destinationIds.includes(order.destinationId)) return "destination";
  if (conditions.visaTypes.length && (!order.visaType || !conditions.visaTypes.includes(order.visaType))) return "destination";
  if (conditions.minTotal != null && conditions.minTotal > 0 && order.total < conditions.minTotal) return "minimum";
  return null;
}

const marketTimeZone = "Africa/Cairo";

/** Calendar day in the market timezone, as YYYY-MM-DD. */
export function marketDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: marketTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Hour of the day in the market timezone, 0 to 23. */
export function marketHour(date: Date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: marketTimeZone, hourCycle: "h23", hour: "2-digit" }).format(date));
}

/** Start or end of a calendar day in the market timezone. */
export function marketBound(day: string, edge: "start" | "end") {
  const wall = edge === "start" ? `${day}T00:00:00.000Z` : `${day}T23:59:59.999Z`;
  return marketWallTime(wall);
}

/** A wall-clock time in the market timezone, written as `YYYY-MM-DDTHH:mm`, as a UTC ISO string. */
export function marketWallTime(local: string) {
  const labeled = new Date(local.length === 16 ? `${local}:00.000Z` : local);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: marketTimeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(labeled);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const shown = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return new Date(labeled.getTime() - (shown - labeled.getTime())).toISOString();
}

export function couponWindowOpen(input: { active: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  if (!input.active) return "inactive" as const;
  const today = marketDay(now);
  if (input.startsAt && today < marketDay(input.startsAt)) return "early" as const;
  if (input.endsAt && today > marketDay(input.endsAt)) return "expired" as const;
  return null;
}

const copy: Record<"en" | "ar", Record<CouponReject, string>> = {
  en: {
    missing: "That code is not valid.",
    inactive: "That code is paused.",
    early: "That code is not active yet.",
    expired: "That code has expired.",
    destination: "That code does not apply to this visa.",
    minimum: "That code needs a larger order.",
    used_up: "That code has been used up.",
    used_by_you: "You have already used that code.",
    first_order: "That code is for a first order only.",
    not_yours: "That code is not available on your account.",
    empty: "Enter a discount code.",
  },
  ar: {
    missing: "هذا الرمز غير صالح.",
    inactive: "هذا الرمز متوقف.",
    early: "هذا الرمز لم يبدأ بعد.",
    expired: "انتهت صلاحية هذا الرمز.",
    destination: "هذا الرمز لا يسري على هذه التأشيرة.",
    minimum: "هذا الرمز يحتاج طلباً بقيمة أكبر.",
    used_up: "استُهلك هذا الرمز.",
    used_by_you: "استخدمت هذا الرمز من قبل.",
    first_order: "هذا الرمز لأول طلب فقط.",
    not_yours: "هذا الرمز غير متاح لحسابك.",
    empty: "أدخل رمز الخصم.",
  },
};

export function couponError(locale: string, reason: CouponReject) {
  return (locale.toLowerCase().startsWith("ar") ? copy.ar : copy.en)[reason];
}
