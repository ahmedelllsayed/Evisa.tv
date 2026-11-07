import { isArabicLocale } from "@/lib/i18n";
import { processingLabel } from "@/lib/visa";

function arabicCount(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  return n <= 10 ? `${n} ${few}` : `${n} ${many}`;
}

/** Processing time in words, with Arabic dual and plural forms. */
export function durationLabel(hours: number, locale: string) {
  if (!isArabicLocale(locale)) return processingLabel(hours, locale);
  if (hours < 1) return "دقائق";
  if (hours < 24) return arabicCount(hours, "ساعة واحدة", "ساعتان", "ساعات", "ساعة");
  const days = Math.ceil(hours / 24);
  return arabicCount(days, "يوم واحد", "يومان", "أيام", "يوماً");
}
