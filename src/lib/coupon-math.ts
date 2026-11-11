export type CouponKind = "percent" | "fixed";
export type CouponAppliesTo = "service" | "total";

export type CouponRule = {
  kind: CouponKind;
  value: number;
  appliesTo: CouponAppliesTo;
};

export type CouponReject = "missing" | "inactive" | "early" | "expired" | "destination" | "used_up" | "used_by_you" | "empty";

export type CouponDraft = {
  id?: string | null;
  code: string;
  kind: CouponKind;
  value: number;
  appliesTo: CouponAppliesTo;
  destinationId: string | null;
  active: boolean;
  startsOn: string | null;
  endsOn: string | null;
  maxUses: number | null;
};

export type CouponRecord = {
  id: string;
  code: string;
  kind: CouponKind;
  value: number;
  appliesTo: CouponAppliesTo;
  destinationId: string | null;
  destinationName: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  heldCount: number;
};

export function normalizeCouponCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function couponCodeOk(code: string) {
  return /^[A-Z0-9][A-Z0-9-]{2,19}$/.test(code);
}

/** Discount in whole currency units. It never exceeds the chosen base, and never the total. */
export function discountAmount(fees: { govFee: number; serviceFee: number }, coupon: CouponRule) {
  const gov = Math.max(0, fees.govFee);
  const service = Math.max(0, fees.serviceFee);
  const total = gov + service;
  const base = coupon.appliesTo === "service" ? service : total;
  if (base <= 0 || !(coupon.value > 0)) return 0;
  const raw = coupon.kind === "percent" ? (base * coupon.value) / 100 : coupon.value;
  return Math.min(base, Math.max(0, Math.round(raw)));
}

export function couponWindowOpen(input: { active: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  if (!input.active) return "inactive" as const;
  if (input.startsAt && now < input.startsAt) return "early" as const;
  if (input.endsAt && now > input.endsAt) return "expired" as const;
  return null;
}

const copy = {
  en: {
    missing: "That code is not valid.",
    inactive: "That code is paused.",
    early: "That code is not active yet.",
    expired: "That code has expired.",
    destination: "That code does not apply to this visa.",
    used_up: "That code has been used up.",
    used_by_you: "You have already used that code.",
    empty: "Enter a discount code.",
  },
  ar: {
    missing: "هذا الرمز غير صالح.",
    inactive: "هذا الرمز متوقف.",
    early: "هذا الرمز لم يبدأ بعد.",
    expired: "انتهت صلاحية هذا الرمز.",
    destination: "هذا الرمز لا يسري على هذه التأشيرة.",
    used_up: "استُهلك هذا الرمز.",
    used_by_you: "استخدمت هذا الرمز من قبل.",
    empty: "أدخل رمز الخصم.",
  },
};

export function couponError(locale: string, reason: CouponReject) {
  return (locale.toLowerCase().startsWith("ar") ? copy.ar : copy.en)[reason];
}
