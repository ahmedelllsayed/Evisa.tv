import { siteConfig } from "@/config/site.config";
import { isArabicLocale } from "@/lib/i18n";

const DAY_MS = 864e5;

/** Today's calendar date (YYYY-MM-DD) in the market time zone. Call on the server only. */
export function marketToday(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.market.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const utc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));

export function addDays(day: string, days: number) {
  return new Date(utc(day) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

/** Arabic count agreement: 1, 2, 3–10 and 11+ take different noun forms. */
export function countPhrase(locale: string, n: number, en: [string, string], ar: [one: string, two: string, few: string, many: string]) {
  if (!isArabicLocale(locale)) return `${n} ${n === 1 ? en[0] : en[1]}`;
  if (n === 1) return ar[0];
  if (n === 2) return ar[1];
  if (n >= 3 && n <= 10) return `${n} ${ar[2]}`;
  return `${n} ${ar[3]}`;
}

export function dayCount(locale: string, n: number) {
  return countPhrase(locale, n, ["day", "days"], ["يوم واحد", "يومان", "أيام", "يوماً"]);
}

/** "Today", "Tomorrow", "In 12 days". */
export function relativeDays(locale: string, n: number) {
  const ar = isArabicLocale(locale);
  if (n <= 0) return ar ? "اليوم" : "Today";
  if (n === 1) return ar ? "غداً" : "Tomorrow";
  if (n === 2) return ar ? "بعد يومين" : "In 2 days";
  return ar ? `بعد ${dayCount(locale, n)}` : `In ${n} days`;
}
