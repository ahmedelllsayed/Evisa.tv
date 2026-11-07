/** Folds case, Latin accents, Arabic diacritics and hamza/ta-marbuta variants so "تركيا", "تُركيا" and "Türkiye" style input all match. */
export function normalizeSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/[ئى]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesAll(haystack: string, query: string) {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const text = normalizeSearch(haystack);
  return terms.every((term) => text.includes(term));
}
