export type TimeUnit = "hour" | "day" | "month";
export type SpanUnit = "day" | "month" | "year";

const HOURS: Record<TimeUnit, number> = { hour: 1, day: 24, month: 24 * 30 };

export function hoursToParts(hours: number | null): { amount: string; unit: TimeUnit } {
  if (hours == null || hours <= 0) return { amount: "", unit: "day" };
  if (hours % HOURS.month === 0) return { amount: String(hours / HOURS.month), unit: "month" };
  if (hours % HOURS.day === 0) return { amount: String(hours / HOURS.day), unit: "day" };
  return { amount: String(hours), unit: "hour" };
}

export function partsToHours(amount: string, unit: TimeUnit): number | null {
  const n = Number(amount);
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * HOURS[unit]);
}

export function timePreview(amount: string, unit: TimeUnit) {
  const n = Number(amount);
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return "بدون مدة";
  if (unit === "hour") return n === 1 ? "ساعة واحدة" : `${n} ساعات`;
  if (unit === "day") return n === 1 ? "يوم واحد" : `${n} أيام`;
  return n === 1 ? "شهر واحد (30 يوماً)" : `${n} أشهر`;
}

export function parseSpan(en: string | null | undefined, ar: string | null | undefined): { amount: string; unit: SpanUnit } | null {
  const text = `${en ?? ""} ${ar ?? ""}`.toLowerCase();
  const amount = text.match(/\d+/)?.[0];
  if (!amount) return null;
  if (/year|years|سنة|سنوات|سنين/.test(text)) return { amount, unit: "year" };
  if (/month|months|شهر|أشهر|شهور/.test(text)) return { amount, unit: "month" };
  if (/day|days|يوم|أيام/.test(text) || text.trim() === amount) return { amount, unit: "day" };
  return null;
}

export function spanPhrase(amount: string, unit: SpanUnit): { en: string; ar: string } | null {
  const n = Number(amount);
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return null;
  if (unit === "day") return { en: n === 1 ? "1 day" : `${n} days`, ar: n === 1 ? "يوم واحد" : `${n} أيام` };
  if (unit === "month") return { en: n === 1 ? "1 month" : `${n} months`, ar: n === 1 ? "شهر واحد" : `${n} أشهر` };
  return { en: n === 1 ? "1 year" : `${n} years`, ar: n === 1 ? "سنة واحدة" : `${n} سنوات` };
}

export const visaTypeOptions = [
  { value: "e-visa", label: "تأشيرة إلكترونية" },
  { value: "sticker", label: "ملصق في الجواز" },
  { value: "eta", label: "تصريح إلكتروني" },
  { value: "visa-free", label: "بدون تأشيرة" },
] as const;

export const regionOptions = [
  { value: "Africa", label: "أفريقيا" },
  { value: "Asia", label: "آسيا" },
  { value: "Europe", label: "أوروبا" },
  { value: "Middle East", label: "الشرق الأوسط" },
  { value: "North America", label: "أمريكا الشمالية" },
  { value: "South America", label: "أمريكا الجنوبية" },
  { value: "Oceania", label: "أوقيانوسيا" },
];

export const entryOptions = [
  { value: "Single", label: "دخول مرة واحدة", ar: "مرة واحدة" },
  { value: "Double", label: "دخول مرتين", ar: "مرتان" },
  { value: "Multiple", label: "دخول متعدد", ar: "متعدد" },
];

export const methodOptions = [
  { value: "Paperless", label: "إلكتروني بدون ورق", ar: "بدون ورق" },
  { value: "Embassy", label: "عبر السفارة", ar: "عبر السفارة" },
  { value: "Visa on arrival", label: "عند الوصول", ar: "عند الوصول" },
  { value: "e-Visa portal", label: "بوابة التأشيرة", ar: "بوابة التأشيرة" },
];

export const portOptions = [
  { value: "All Ports of Entry", label: "كل المنافذ" },
  { value: "Airports only", label: "المطارات فقط" },
  { value: "Designated ports", label: "منافذ محددة" },
];

export function withCurrent<T extends { value: string; label: string }>(options: T[], current: string | null | undefined): T[] {
  const value = (current ?? "").trim();
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ value, label: value } as T, ...options];
}
