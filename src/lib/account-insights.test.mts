import assert from "node:assert/strict";
import test from "node:test";
import { accountTasks, passportHealth, profileChecklist, stageIndex, targetCountdown } from "./account-insights.ts";

const now = new Date("2026-11-07T10:00:00Z");

test("passport validity counts six months from the trip, or from today without one", () => {
  assert.equal(passportHealth("", { now }), "missing");
  assert.equal(passportHealth("2026-10-01", { now }), "expired");
  assert.equal(passportHealth("2027-03-01", { now }), "short");
  assert.equal(passportHealth("2027-08-01", { now }), "ok");
  assert.equal(passportHealth("2027-08-01", { now, departure: "2027-04-01" }), "short");
});

test("the countdown only runs for paid files that are still open", () => {
  assert.equal(targetCountdown("draft", "2026-11-10T10:00:00Z", now), null);
  assert.equal(targetCountdown("approved", "2026-11-10T10:00:00Z", now), null);
  assert.deepEqual(targetCountdown("in_review", "2026-11-10T10:00:00Z", now), { days: 3, late: false });
  assert.equal(targetCountdown("in_review", "2026-11-06T10:00:00Z", now)?.late, true);
});

test("stages follow the status and leave the track when cancelled", () => {
  assert.equal(stageIndex("draft"), 0);
  assert.equal(stageIndex("in_review"), 2);
  assert.equal(stageIndex("approved"), 4);
  assert.equal(stageIndex("refunded"), -1);
});

test("the profile checklist needs a passport scan and a valid expiry", () => {
  const base = { firstName: "Omar", lastName: "Khaled", dateOfBirth: "1990-01-01", nationality: "EG", passportNumber: "A1", passportExpiry: "2030-01-01", phone: "+201223334455" };
  assert.equal(profileChecklist({ ...base, documentKinds: ["passport", "photo"] }).percent, 100);
  const partial = profileChecklist({ ...base, passportExpiry: "2020-01-01", documentKinds: ["photo"] });
  assert.deepEqual(partial.items.filter((item) => !item.done).map((item) => item.id), ["expiry", "scan"]);
});

test("tasks put unpaid files first and skip closed files", () => {
  const tasks = accountTasks({
    now,
    apps: [
      { id: "a", status: "draft", updatedAt: "2026-11-06" },
      { id: "b", status: "in_review", updatedAt: "2026-11-05" },
      { id: "c", status: "payment_pending", updatedAt: "2026-11-01" },
      { id: "d", status: "rejected", updatedAt: "2026-11-01" },
    ],
    gaps: [
      { applicationId: "b", missing: 1, rejected: 2 },
      { applicationId: "d", missing: 3, rejected: 0 },
    ],
    visas: [{ applicationId: "e", createdAt: "2026-11-01" }],
    passport: "short",
    profilePercent: 80,
  });
  assert.deepEqual(tasks.map((task) => task.kind), ["pay", "fix_document", "missing_document", "visa_ready", "draft", "passport", "profile"]);
  assert.equal(tasks[1]?.count, 2);
});
