import assert from "node:assert/strict";
import test from "node:test";
import { acceptedDeparture, earliestDepartureDay, guaranteedDate } from "./visa.ts";

const from = new Date("2026-11-08T16:55:00Z");

test("departure cannot be on or before the target day", () => {
  assert.equal(guaranteedDate(240, from).toISOString(), "2026-11-18T16:55:00.000Z");
  assert.equal(earliestDepartureDay(240, from), "2026-11-19");
  assert.equal(acceptedDeparture("2026-11-18", 240, from), null);
  assert.equal(acceptedDeparture("2026-11-08", 240, from), null);
  assert.equal(acceptedDeparture("2026-11-19", 240, from), "2026-11-19");
  assert.equal(acceptedDeparture(null, 240, from), null);
});
