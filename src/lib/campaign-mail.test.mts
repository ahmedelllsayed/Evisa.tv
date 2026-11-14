import assert from "node:assert/strict";
import test from "node:test";
import { cleanAudienceFilter, messageWithCoupon, normalizeSex, parseContactImport } from "./campaign-mail.ts";

test("pasted addresses keep a name and skip a header or a bad line", () => {
  const parsed = parseContactImport("email,name\nAda <ada@example.com>\nbad-line\nmona@example.com, Mona\nADA@example.com");
  assert.equal(parsed.invalid, 1);
  assert.deepEqual(parsed.contacts, [
    { email: "ada@example.com", name: "Ada" },
    { email: "mona@example.com", name: "Mona" },
  ]);
});

test("a coupon code is inserted once", () => {
  assert.equal(messageWithCoupon("استخدم {{code}} اليوم", "SAVE10"), "استخدم SAVE10 اليوم");
  assert.equal(messageWithCoupon("عرض جديد", "SAVE10"), "عرض جديد\n\nرمز الخصم: SAVE10");
  assert.equal(messageWithCoupon("الرمز SAVE10 جاهز", "SAVE10"), "الرمز SAVE10 جاهز");
});

test("sex values and audience filters are normalized", () => {
  assert.equal(normalizeSex("F"), "female");
  assert.equal(normalizeSex(""), null);
  const cleaned = cleanAudienceFilter({
    source: "both",
    visaType: "e-voa",
    sex: "male",
    purchases: "min",
    minPurchases: 3.2,
    destinationId: null,
    nationality: "eg",
    query: "  mona  ",
  });
  assert.equal(cleaned.ok, true);
  if (cleaned.ok) {
    assert.equal(cleaned.filter.minPurchases, 3);
    assert.equal(cleaned.filter.nationality, "EG");
    assert.equal(cleaned.filter.query, "mona");
  }
  assert.equal(cleanAudienceFilter({ source: "customers", visaType: "paper", sex: null, purchases: "any", minPurchases: null, destinationId: null, nationality: null, query: "" }).ok, false);
});
