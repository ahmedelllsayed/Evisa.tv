import assert from "node:assert/strict";
import test from "node:test";
import { paymobDecision } from "../paymob-decision.ts";
import { canStartTravelFulfillment, isTravelMerchantOrder, reservationTotal } from "./pricing.ts";

const fees = { flight: 499, hotel: 399, itinerary: 199, insurance: 149 };
const none = { flight: false, hotel: false, itinerary: false, insurance: false };

test("reservation price adds only the selected services", () => {
  assert.equal(reservationTotal({ ...none, flight: true }, fees), 499);
  assert.equal(reservationTotal({ ...none, flight: true, hotel: true }, fees), 898);
  assert.equal(reservationTotal({ flight: true, hotel: true, itinerary: true, insurance: true }, fees), 1246);
  assert.equal(reservationTotal(none, fees), 0);
});

test("travel payment orders are the ones whose reference starts with TR-", () => {
  assert.equal(isTravelMerchantOrder("TR-AB12CD34"), true);
  assert.equal(isTravelMerchantOrder("ATL-AB12CD3"), false);
  assert.equal(isTravelMerchantOrder(""), false);
});

test("a travel payment uses the same amount check as a visa payment", () => {
  const stored = { merchantOrderId: "TR-AB12CD34", currency: "EGP", amount: 499, transactionId: null, status: "pending" };
  assert.equal(
    paymobDecision(stored, {
      merchantOrderId: "TR-AB12CD34",
      amountCents: 40000,
      currency: "EGP",
      success: true,
      pending: false,
      refunded: false,
      transactionId: "1",
    }).ok,
    false,
  );
  assert.equal(
    paymobDecision(stored, {
      merchantOrderId: "TR-AB12CD34",
      amountCents: 49900,
      currency: "EGP",
      success: true,
      pending: false,
      refunded: false,
      transactionId: "1",
    }).reason,
    "paid",
  );
});

test("a reservation is booked only after payment", () => {
  assert.equal(canStartTravelFulfillment("pending_payment"), false);
  assert.equal(canStartTravelFulfillment("paid"), true);
  assert.equal(canStartTravelFulfillment("needs_attention"), true);
  assert.equal(canStartTravelFulfillment("sent"), false);
});
