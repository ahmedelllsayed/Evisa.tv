import { countries } from "@/lib/countries";

const knownCountries = new Set(countries.map((country) => country.code));

/** Accepts a jsonb array, a JSON string, or a JSON string wrapped inside another string. */
export function normalizeCitizenshipCodes(value: unknown): string[] {
  let current = value;
  for (let depth = 0; depth < 3 && typeof current === "string"; depth += 1) {
    const trimmed = current.trim();
    if (!trimmed) return [];
    try {
      current = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(current)) return [];
  return [...new Set(current.map((code) => String(code).trim().toUpperCase()).filter((code) => knownCountries.has(code)))];
}
