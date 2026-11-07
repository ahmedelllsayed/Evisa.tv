import type { ApplicationGapCount } from "@/lib/account";
import { isClosedStatus, isUnpaidStatus } from "@/lib/account-insights";
import { isArabicLocale } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import type { Application } from "@/lib/types";

export const tabs = ["overview", "orders", "visas", "files", "payments", "profile"] as const;
export type Tab = (typeof tabs)[number];

export function isTab(value: string): value is Tab {
  return (tabs as readonly string[]).includes(value);
}

export const orderFilters = ["all", "action", "open", "approved", "closed"] as const;
export type OrderFilter = (typeof orderFilters)[number];

export function destinationName(row: Pick<Application, "destinationName" | "destinationNameAr" | "destinationCode">, locale: string) {
  return localizedDestinationName({ name: row.destinationName, nameAr: row.destinationNameAr, code: row.destinationCode }, locale);
}

export function needsAction(app: Pick<Application, "status">, gap?: ApplicationGapCount) {
  if (isUnpaidStatus(app.status)) return true;
  return !isClosedStatus(app.status) && Boolean(gap && (gap.missing || gap.rejected));
}

export function matchesFilter(app: Pick<Application, "status">, filter: OrderFilter, gap?: ApplicationGapCount) {
  switch (filter) {
    case "action":
      return needsAction(app, gap);
    case "open":
      return !isClosedStatus(app.status);
    case "approved":
      return app.status === "approved";
    case "closed":
      return isClosedStatus(app.status) && app.status !== "approved";
    default:
      return true;
  }
}

/** Folds case, Latin accents, Arabic diacritics and letter variants so "مصر" matches "مِصْر" and "Türkiye" matches "turkiye". */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

/** Arabic counted nouns: [one, two, 3-10, 11+]. */
export function plural(locale: string, n: number, en: [string, string], ar: [string, string, string, string]) {
  if (!isArabicLocale(locale)) return `${n} ${n === 1 ? en[0] : en[1]}`;
  if (n === 1) return ar[0];
  if (n === 2) return ar[1];
  return `${n} ${n >= 3 && n <= 10 ? ar[2] : ar[3]}`;
}

export function documentCount(locale: string, n: number) {
  return plural(locale, n, ["document", "documents"], ["مستند واحد", "مستندان", "مستندات", "مستنداً"]);
}

export function inDays(locale: string, days: number) {
  const ar = isArabicLocale(locale);
  if (days === 0) return ar ? "اليوم" : "today";
  if (days === 1) return ar ? "غداً" : "tomorrow";
  if (days === -1) return ar ? "أمس" : "yesterday";
  const span = plural(locale, Math.abs(days), ["day", "days"], ["يوم", "يومين", "أيام", "يوماً"]);
  if (days > 0) return ar ? `بعد ${span}` : `in ${span}`;
  return ar ? `منذ ${span}` : `${span} ago`;
}

/** Passport names are often stored in capitals; show "Omar" rather than "OMAR". */
export function displayName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (!first || first !== first.toUpperCase()) return first;
  return first.charAt(0) + first.slice(1).toLowerCase();
}

export function sumByCurrency(rows: { amount: number; currency: string }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}
