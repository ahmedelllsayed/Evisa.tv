import assert from "node:assert/strict";
import test from "node:test";
import { cleanAudienceFilter, describeFilter, emptyFilter, normalizeSex, parseContactImport } from "./audience.ts";
import { gowaPhone, normalizePhone, phoneForProvider, smsParts } from "./phone.ts";
import { cleanContent, contentProblem, fillVariables, pickLanguage, renderEmail, renderSms, withCode } from "./render.ts";

test("pasted contacts accept email, phone, and name in any order", () => {
  const parsed = parseContactImport("email,name\nAda <ada@example.com>\nbad-line\n01012345678, منى\nmona@example.com, Mona, +971501234567\nADA@example.com");
  assert.equal(parsed.invalid, 1);
  assert.deepEqual(parsed.contacts, [
    { email: "ada@example.com", phone: null, name: "Ada" },
    { email: null, phone: "+201012345678", name: "منى" },
    { email: "mona@example.com", phone: "+971501234567", name: "Mona" },
  ]);
});

test("Egyptian numbers become international and providers get their format", () => {
  assert.equal(normalizePhone("010 1234 5678"), "+201012345678");
  assert.equal(normalizePhone("00201112345678"), "+201112345678");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("0212345678"), null);
  assert.equal(phoneForProvider("+201012345678", "digits"), "201012345678");
  assert.equal(phoneForProvider("+201012345678", "local"), "01012345678");
  assert.equal(gowaPhone("+201012345678"), "201012345678@s.whatsapp.net");
});

test("Arabic text messages use the shorter parts", () => {
  assert.deepEqual(smsParts("Hello"), { chars: 5, parts: 1, unicode: false });
  assert.equal(smsParts("a".repeat(161)).parts, 2);
  assert.equal(smsParts("مرحبا").unicode, true);
  assert.equal(smsParts("م".repeat(71)).parts, 2);
});

test("old saved filters fill new keys, and bad values are refused", () => {
  const cleaned = cleanAudienceFilter({ source: "both", visaType: "e-voa", sex: "male", purchases: "min", minPurchases: 3.2, nationality: "eg", query: "  mona  " });
  assert.equal(cleaned.ok, true);
  if (cleaned.ok) {
    assert.equal(cleaned.filter.minPurchases, 3);
    assert.equal(cleaned.filter.nationality, "EG");
    assert.equal(cleaned.filter.query, "mona");
    assert.equal(cleaned.filter.hasUnpaid, "any");
    assert.deepEqual(cleaned.filter.listIds, []);
  }
  assert.equal(cleanAudienceFilter({ visaType: "paper" }).ok, false);
  assert.equal(cleanAudienceFilter({ joinedFrom: "2026-02-01", joinedTo: "2026-01-01" }).ok, false);
  assert.equal(normalizeSex("F"), "female");
  assert.match(describeFilter({ ...emptyFilter, purchases: "repeat" }), /متكرر/);
});

test("messages place the code once and switch to English only when it exists", () => {
  const content = cleanContent({ subject: "عرض", body: "أهلاً {{name}}، افتح {{link}}", bodyEn: "Hi {{name}}" });
  assert.equal(pickLanguage(content, "en-EG").body, "Hi {{name}}");
  assert.equal(pickLanguage(cleanContent({ body: "عربي" }), "en-EG").body, "عربي");
  assert.equal(withCode("استخدم {{code}}", "SAVE", false), "استخدم {{code}}");
  assert.equal(withCode("عرض", "SAVE", false), "عرض\n\nرمز الخصم: SAVE");
  assert.equal(fillVariables("{{name}} {{code}}", { name: "منى", code: "SAVE", link: "x" }), "منى SAVE");
  const sms = renderSms({ content, locale: "ar-EG", vars: { name: "منى", code: null, link: "https://e.tv/m" }, stopUrl: "https://e.tv/s" });
  assert.equal(sms, "أهلاً منى، افتح https://e.tv/m\nإلغاء: https://e.tv/s");
  const mail = renderEmail({ content, locale: "ar-EG", vars: { name: "منى", code: "SAVE", link: "https://e.tv/m" }, brand: "Evisa", address: null, stopUrl: "https://e.tv/s" });
  assert.equal(mail.subject, "عرض");
  assert.match(mail.html, /dir="rtl"/);
  assert.match(mail.text, /رمز الخصم: SAVE/);
  assert.equal(contentProblem("email", cleanContent({ body: "نص" })), "اكتب موضوع الرسالة.");
  assert.equal(contentProblem("whatsapp", cleanContent({ waName: "spring_offer", waLanguage: "ar" })), null);
  assert.equal(contentProblem("whatsapp", cleanContent({ body: "مرحبا بك" }), "gowa"), null);
  assert.equal(contentProblem("whatsapp", cleanContent({ body: "x" }), "gowa")?.includes("نص"), true);
});
