import assert from "node:assert/strict";
import test from "node:test";
import { sniffMime } from "./uploads.ts";

test("sniffs jpeg, png, webp and pdf", () => {
  assert.equal(sniffMime(Uint8Array.from([0xff, 0xd8, 0xff, 0])), "image/jpeg");
  assert.equal(sniffMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46], 0);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);
  assert.equal(sniffMime(webp), "image/webp");
  assert.equal(sniffMime(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])), "application/pdf");
});

test("rejects a text file that claims to be an image", () => {
  assert.equal(sniffMime(new TextEncoder().encode("<html>")), null);
});
