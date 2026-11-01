import assert from "node:assert/strict";
import test from "node:test";
import { documentGaps } from "./application-rules.ts";
import { paymobDecision, paymentCanMarkPaid } from "./paymob-decision.ts";
import { governmentFeeCharged, optionTotal } from "./visa.ts";

test("sticker visas collected at the embassy do not charge the government fee online", () => {
  assert.equal(governmentFeeCharged({ govFee: 1000, visaType: "sticker", embassyVisit: true }), 0);
  assert.equal(governmentFeeCharged({ govFee: 1000, visaType: "e-visa", embassyVisit: false }), 1000);
});

test("option total adds the express fee only when express is chosen", () => {
  const option = { govFee: 1000, serviceFee: 250, expressHours: 24, expressFee: 400 };
  assert.equal(optionTotal(option, false), 1250);
  assert.equal(optionTotal(option, true), 1650);
  assert.equal(optionTotal({ ...option, visaType: "sticker", embassyVisit: true }, true), 650);
});

test("document gaps keep rejected files and ignore approved ones", () => {
  const gaps = documentGaps(
    ["passport", "photo"],
    [{ id: "t1", firstName: "Sara", lastName: "Ali" }],
    [
      { travelerId: "t1", kind: "passport", status: "approved" },
      { travelerId: "t1", kind: "photo", status: "rejected", rejectReason: "blurry" },
    ],
  );
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0]?.kind, "photo");
  assert.equal(gaps[0]?.reason, "rejected");
  assert.equal(gaps[0]?.rejectReason, "blurry");
});

test("payment confirmation rejects a mismatched charge and accepts the exact one", () => {
  const stored = { merchantOrderId: "order", currency: "EGP", amount: 1250, transactionId: null, status: "pending" };
  const incoming = {
    merchantOrderId: "order",
    amountCents: 125000,
    currency: "EGP",
    success: true,
    pending: false,
    refunded: false,
    transactionId: "tx",
  };
  assert.equal(paymobDecision({ ...stored, merchantOrderId: "other" }, incoming).reason, "order");
  assert.equal(paymobDecision(stored, { ...incoming, amountCents: 100 }).reason, "amount");
  assert.equal(paymobDecision(stored, { ...incoming, currency: "USD" }).reason, "currency");
  assert.equal(paymobDecision(stored, { ...incoming, pending: true }).reason, "pending");
  assert.equal(paymobDecision(stored, { ...incoming, success: false }).reason, "failed");
  assert.equal(paymobDecision({ ...stored, status: "paid" }, { ...incoming, refunded: true }).reason, "refunded");
  assert.equal(paymobDecision({ ...stored, status: "paid", transactionId: "tx" }, incoming).reason, "duplicate");
  assert.equal(paymobDecision(stored, incoming).reason, "paid");
});

test("only an unpaid application can be marked paid", () => {
  assert.equal(paymentCanMarkPaid("draft"), true);
  assert.equal(paymentCanMarkPaid("payment_pending"), true);
  assert.equal(paymentCanMarkPaid("submitted"), false);
  assert.equal(paymentCanMarkPaid("approved"), false);
});
