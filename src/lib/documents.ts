const CUSTOM_PREFIX = "+";

export function customDocumentParts(kind: string) {
  if (!kind.startsWith(CUSTOM_PREFIX)) return null;
  const [en, ar] = kind.slice(1).split("|");
  const english = (en || ar || "").trim();
  const arabic = (ar || en || "").trim();
  if (!english && !arabic) return null;
  return { en: english || arabic, ar: arabic || english };
}

export function encodeCustomDocument(english: string, arabic: string) {
  const clean = (value: string) => value.replace(/[|+]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const en = clean(english);
  const ar = clean(arabic);
  if (!en && !ar) return null;
  return `${CUSTOM_PREFIX}${en || ar}|${ar || en}`;
}
