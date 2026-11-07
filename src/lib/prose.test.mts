import assert from "node:assert/strict";
import test from "node:test";
import { parseProse, proseOutline } from "./prose.ts";

test("a heading directly above its paragraph is split from it", () => {
  const blocks = parseProse("## 1. What we collect\nAccount details and logs.\n\n## 2. How we use it\nTo process visas.");
  assert.deepEqual(blocks, [
    { kind: "heading", id: "section-1", text: "1. What we collect" },
    { kind: "paragraph", text: "Account details and logs." },
    { kind: "heading", id: "section-2", text: "2. How we use it" },
    { kind: "paragraph", text: "To process visas." },
  ]);
});

test("lists, sub-headings and wrapped paragraphs", () => {
  const blocks = parseProse("Intro line one\nline two\n- first\n- second\n### Note\nEnd.");
  assert.deepEqual(blocks, [
    { kind: "paragraph", text: "Intro line one line two" },
    { kind: "list", items: ["first", "second"] },
    { kind: "subheading", text: "Note" },
    { kind: "paragraph", text: "End." },
  ]);
  assert.deepEqual(proseOutline(parseProse("## A\nx\n## B")), [
    { id: "section-1", text: "A" },
    { id: "section-2", text: "B" },
  ]);
});

test("empty bodies give no blocks", () => {
  assert.deepEqual(parseProse(""), []);
  assert.deepEqual(parseProse(undefined), []);
});
