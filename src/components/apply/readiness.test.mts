import assert from "node:assert/strict";
import test from "node:test";
import { dobProblem, feePreview, forwardUnlocked, nameProblem, passportProblem, passportTooShort, phoneOk, travelerBlocks, warnsSixMonths, type TravelerDraft } from "./readiness.ts";

const today = "2026-11-07";

function draft(patch: Partial<TravelerDraft> = {}): TravelerDraft {
  return {
    firstName: "Ahmed",
    lastName: "Elsayed",
    sex: "male",
    dateOfBirth: "1990-04-12",
    nationality: "EG",
    passportNumber: "A12345678",
    passportExpiry: "2031-03-15",
    ...patch,
  };
}

test("names have to match a passport: English letters, not empty, not huge", () => {
  assert.equal(nameProblem(""), "empty");
  assert.equal(nameProblem("أحمد"), "letters");
  assert.equal(nameProblem("A".repeat(51)), "long");
  assert.equal(nameProblem("Ahmed"), null);
  assert.equal(nameProblem("Anne-Marie"), null);
});

test("a passport that expires within 180 days of departure is refused", () => {
  assert.equal(passportTooShort("2027-05-01", "2026-12-01"), true);
  assert.equal(passportTooShort("2027-06-01", "2026-12-01"), false);
  assert.equal(passportTooShort("2027-01-01", null), false);
  assert.equal(passportProblem("", "2026-12-01", today), "empty");
  assert.equal(passportProblem("2026-11-01", null, today), "expired");
  assert.equal(passportProblem("2027-05-01", "2026-12-01", today), "short");
  assert.equal(passportProblem("2031-03-15", "2026-12-01", today), null);
});

test("without a trip date, a passport inside 180 days is a warning only", () => {
  assert.equal(warnsSixMonths("2027-03-01", null, today), true);
  assert.equal(warnsSixMonths("2027-06-01", null, today), false);
  assert.equal(warnsSixMonths("2027-03-01", "2026-12-01", today), false);
  assert.equal(warnsSixMonths("2026-01-01", null, today), false);
});

test("a traveller blocks the next step until the passport fields are usable", () => {
  assert.equal(travelerBlocks(draft(), "2026-12-01", today), false);
  assert.equal(travelerBlocks(draft({ firstName: "أحمد" }), null, today), true);
  assert.equal(dobProblem("2026-11-07", today), "future");
  assert.equal(dobProblem("1800-01-01", today), "year");
  assert.equal(travelerBlocks(draft({ passportExpiry: "2027-01-01" }), "2026-12-01", today), true);
});

test("phone and later steps stay closed until the earlier ones are done", () => {
  assert.equal(phoneOk(""), false);
  assert.equal(phoneOk("123"), false);
  assert.equal(phoneOk("+20 100 123 4567"), true);
  assert.equal(forwardUnlocked("documents", { travelers: false, documents: false }), false);
  assert.equal(forwardUnlocked("documents", { travelers: true, documents: false }), true);
  assert.equal(forwardUnlocked("review", { travelers: true, documents: false }), false);
  assert.equal(forwardUnlocked("payment", { travelers: true, documents: true }), true);
  assert.equal(forwardUnlocked("answers", { travelers: true, documents: false }), false);
  assert.equal(forwardUnlocked("review", { travelers: true, documents: true, answers: false }), false);
  assert.equal(forwardUnlocked("payment", { travelers: true, documents: true, answers: true }), true);
});

test("the fee preview follows the traveller count until a payment locks it", () => {
  const fees = { govFee: 200, serviceFee: 100, travelerCount: 2 };
  assert.deepEqual(feePreview(fees, 4, false), { gov: 400, service: 200, total: 600, count: 4 });
  assert.deepEqual(feePreview(fees, 4, true), { gov: 200, service: 100, total: 300, count: 2 });
});
