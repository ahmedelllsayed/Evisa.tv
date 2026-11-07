import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "./safe-path.ts";

test("same-site paths are kept", () => {
  assert.equal(safeNextPath("/en-EG/apply/1", "/en-EG"), "/en-EG/apply/1");
  assert.equal(safeNextPath("/ar-EG/visa/turkey-visa?apply=1", "/"), "/ar-EG/visa/turkey-visa?apply=1");
});

test("external and control-character redirects are rejected", () => {
  assert.equal(safeNextPath("https://evil.com", "/home"), "/home");
  assert.equal(safeNextPath("//evil.com", "/home"), "/home");
  assert.equal(safeNextPath("/\t/evil.com", "/home"), "/home");
  assert.equal(safeNextPath("/%09/evil.com", "/home"), "/home");
  assert.equal(safeNextPath("/\\evil.com", "/home"), "/home");
});
