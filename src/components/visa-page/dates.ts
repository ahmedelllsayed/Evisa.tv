import { siteConfig } from "@/config/site.config";
import { isArabicLocale } from "@/lib/i18n";

const zone = siteConfig.market.timeZone;

function tag(locale: string) {
  return isArabicLocale(locale) ? "ar-EG" : "en-GB";
}

export function dayPart(date: Date, locale: string) {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: zone, day: "2-digit" }).format(date);
}

export function monthPart(date: Date, locale: string) {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: zone, month: "long" }).format(date);
}

export function weekdayTime(date: Date, locale: string) {
  const weekday = new Intl.DateTimeFormat(tag(locale), { timeZone: zone, weekday: "long" }).format(date);
  const time = new Intl.DateTimeFormat(isArabicLocale(locale) ? "ar-EG" : "en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  return isArabicLocale(locale) ? `${weekday}، ${time}` : `${weekday}, ${time}`;
}

export function shortDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: zone, day: "numeric", month: "short" }).format(date);
}

export function longDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: zone, day: "numeric", month: "long", year: "numeric" }).format(date);
}
