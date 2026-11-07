import { isArabicLocale } from "@/lib/i18n";

/** Inline bilingual copy for places that do not need an admin-editable key. */
export function say(locale: string, en: string, ar: string) {
  return isArabicLocale(locale) ? ar : en;
}
