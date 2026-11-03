import assert from "node:assert/strict";
import test from "node:test";
import { canTransition } from "./application-status.ts";

test("a draft cannot jump straight to approved", () => {
  assert.equal(canTransition("draft", "approved"), false);
  assert.equal(canTransition("payment_pending", "approved"), false);
  assert.equal(canTransition("payment_pending", "filed"), false);
});

test("staff can move a submitted file through review and approval", () => {
  assert.equal(canTransition("submitted", "in_review"), true);
  assert.equal(canTransition("in_review", "filed"), true);
  assert.equal(canTransition("filed", "approved"), true);
  assert.equal(canTransition("submitted", "approved"), true);
  assert.equal(canTransition("approved", "refunded"), true);
});

test("payment can submit only an unpaid draft and can refund a charged file", () => {
  assert.equal(canTransition("draft", "submitted", "payment"), true);
  assert.equal(canTransition("payment_pending", "submitted", "payment"), true);
  assert.equal(canTransition("in_review", "submitted", "payment"), false);
  assert.equal(canTransition("submitted", "refunded", "payment"), true);
  assert.equal(canTransition("approved", "draft", "payment"), false);
});

test("the same status is not a transition", () => {
  assert.equal(canTransition("in_review", "in_review"), true);
  assert.equal(canTransition("refunded", "approved"), false);
});
