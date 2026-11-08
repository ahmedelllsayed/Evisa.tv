import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCitizenshipCodes } from "./citizenship-codes.ts";

test("a saved citizenship list survives a json string and a double-encoded string", () => {
  assert.deepEqual(normalizeCitizenshipCodes(["eg", "AE", "NOPE"]), ["EG", "AE"]);
  assert.deepEqual(normalizeCitizenshipCodes(JSON.stringify(["SA", "eg"])), ["SA", "EG"]);
  assert.deepEqual(normalizeCitizenshipCodes(JSON.stringify(JSON.stringify(["QA", "AE"]))), ["QA", "AE"]);
  assert.deepEqual(normalizeCitizenshipCodes(""), []);
  assert.deepEqual(normalizeCitizenshipCodes("not-json"), []);
  assert.deepEqual(normalizeCitizenshipCodes({ EG: true }), []);
});
