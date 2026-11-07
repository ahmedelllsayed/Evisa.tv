export type ProseBlock =
  | { kind: "heading"; id: string; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

/**
 * Admin-written body text: "## " starts a section, "### " a sub-heading, "- " a list item,
 * and a blank line ends a paragraph. A heading may sit directly above its paragraph.
 */
export function parseProse(body: string | undefined): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let sections = 0;
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    if (list.length) blocks.push({ kind: "list", items: list });
    paragraph = [];
    list = [];
  };
  for (const raw of (body ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("### ")) {
      flush();
      blocks.push({ kind: "subheading", text: line.slice(4).trim() });
    } else if (line.startsWith("## ")) {
      flush();
      sections += 1;
      blocks.push({ kind: "heading", id: `section-${sections}`, text: line.slice(3).trim() });
    } else if (/^[-•*]\s+/.test(line)) {
      if (paragraph.length) {
        blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
        paragraph = [];
      }
      list.push(line.replace(/^[-•*]\s+/, ""));
    } else {
      if (list.length) {
        blocks.push({ kind: "list", items: list });
        list = [];
      }
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function proseOutline(blocks: ProseBlock[]) {
  return blocks.flatMap((block) => (block.kind === "heading" ? [{ id: block.id, text: block.text }] : []));
}

/** Rough reading time for Arabic or English text, at least one minute. */
export function readingMinutes(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
