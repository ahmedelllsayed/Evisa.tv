import assert from "node:assert/strict";
import test from "node:test";
import { couponCodeOk, couponFits, couponWindowOpen, discountAmount, marketDay, marketWallTime, normalizeCouponCode } from "./coupon-math.ts";

const fees = { govFee: 1000, serviceFee: 250 };

test("a service-fee coupon never reduces the government fee", () => {
  assert.equal(discountAmount(fees, { kind: "percent", value: 10, appliesTo: "service" }), 25);
  assert.equal(discountAmount(fees, { kind: "fixed", value: 400, appliesTo: "service" }), 250);
  assert.equal(discountAmount(fees, { kind: "fixed", value: 40, appliesTo: "service" }), 40);
});

test("a total coupon is capped at the whole amount and rounds to the pound", () => {
  assert.equal(discountAmount(fees, { kind: "percent", value: 10, appliesTo: "total" }), 125);
  assert.equal(discountAmount(fees, { kind: "fixed", value: 5000, appliesTo: "total" }), 1250);
  assert.equal(discountAmount({ govFee: 0, serviceFee: 0 }, { kind: "fixed", value: 50, appliesTo: "total" }), 0);
  assert.equal(discountAmount({ govFee: 10, serviceFee: 5 }, { kind: "percent", value: 50, appliesTo: "service" }), 3);
});

test("codes are uppercase and a paused or expired code is closed", () => {
  assert.equal(normalizeCouponCode(" save10 "), "SAVE10");
  assert.equal(couponCodeOk("SAVE10"), true);
  assert.equal(couponCodeOk("A"), false);
  const now = new Date("2026-11-11T23:11:00Z");
  assert.equal(couponWindowOpen({ active: true, startsAt: new Date("2026-11-12T00:00:00Z"), endsAt: null }, now), null);
  assert.equal(marketDay(now), "2026-11-12");
  assert.equal(couponWindowOpen({ active: false, startsAt: null, endsAt: null }, now), "inactive");
  assert.equal(couponWindowOpen({ active: true, startsAt: null, endsAt: new Date("2026-11-11T00:00:00Z") }, now), "expired");
  assert.equal(couponWindowOpen({ active: true, startsAt: null, endsAt: new Date("2026-12-01T00:00:00Z") }, now), null);
});

test("a percent cap limits the discount, and conditions check destination, visa type, and minimum", () => {
  assert.equal(discountAmount(fees, { kind: "percent", value: 50, appliesTo: "total", maxDiscount: 200 }), 200);
  assert.equal(discountAmount(fees, { kind: "percent", value: 10, appliesTo: "total", maxDiscount: 500 }), 125);
  const conditions = { destinationIds: ["tr"], visaTypes: ["e-visa"], minTotal: 1000 };
  assert.equal(couponFits(conditions, { destinationId: "tr", visaType: "e-visa", total: 1250 }), null);
  assert.equal(couponFits(conditions, { destinationId: "ma", visaType: "e-visa", total: 1250 }), "destination");
  assert.equal(couponFits(conditions, { destinationId: "tr", visaType: "sticker", total: 1250 }), "destination");
  assert.equal(couponFits(conditions, { destinationId: "tr", visaType: "e-visa", total: 900 }), "minimum");
  assert.equal(couponFits({ destinationIds: [], visaTypes: [], minTotal: null }, { destinationId: "x", visaType: null, total: 0 }), null);
});

test("a Cairo wall time converts to the right UTC instant", () => {
  assert.equal(marketWallTime("2026-11-20T10:30"), "2026-11-20T08:30:00.000Z");
});
