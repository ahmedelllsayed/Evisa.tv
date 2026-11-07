import { isArabicLocale } from "@/lib/i18n";

const numberTag = (locale: string) => (isArabicLocale(locale) ? "ar-EG-u-nu-latn" : "en-US");

/** "3 hours ago" for server-rendered output only; the value depends on the request time. */
export function timeAgo(locale: string, at: string | Date, now: Date) {
  const seconds = Math.round((new Date(at).getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(numberTag(locale), { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return format.format(0, "minute");
  if (abs < 3600) return format.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return format.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 45) return format.format(Math.round(seconds / 86400), "day");
  return format.format(Math.round(seconds / (86400 * 30)), "month");
}

/** `moneyDigits` matches `formatMoney`, which uses Arabic-Indic digits on Arabic pages. */
export function formatPercent(locale: string, ratio: number, { signed = false, moneyDigits = false } = {}) {
  const tag = moneyDigits && isArabicLocale(locale) ? "ar-EG" : numberTag(locale);
  return new Intl.NumberFormat(tag, {
    style: "percent",
    maximumFractionDigits: Math.abs(ratio) < 0.1 ? 1 : 0,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(ratio);
}

export function formatCount(locale: string, value: number) {
  return new Intl.NumberFormat(numberTag(locale)).format(value);
}

const updatedPattern = /^\s*(last updated|updated|آخر تحديث|تاريخ التحديث)\s*[:：]\s*([^.\n]+?)\s*[.。]\s*/i;

/** Policy intros start with "Last updated: <date>." in the CMS; split it out so it can be shown on its own. */
export function splitUpdated(intro: string | undefined) {
  const text = (intro ?? "").trim();
  const match = updatedPattern.exec(text);
  if (!match) return { updated: null, intro: text };
  return { updated: match[2].trim(), intro: text.slice(match[0].length).trim() };
}
