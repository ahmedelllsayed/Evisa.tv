const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const weekdaysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDay(value: string) {
  const match = dayPattern.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}

function dayNumber(value: string) {
  const match = dayPattern.exec(value);
  if (!match) return null;
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). Positive when `to` is later. */
export function daysBetween(from: string, to: string) {
  const a = dayNumber(from);
  const b = dayNumber(to);
  return a == null || b == null ? null : b - a;
}

export function formatDay(value: string) {
  const match = dayPattern.exec(value);
  if (!match) return value || "—";
  return `${Number(match[3])} ${monthsAr[Number(match[2]) - 1]} ${match[1]}`;
}

export function weekday(value: string) {
  const n = dayNumber(value);
  return n == null ? "" : weekdaysAr[(((n + 4) % 7) + 7) % 7];
}

export function monthLabel(value: string) {
  const match = dayPattern.exec(value);
  return match ? `${monthsAr[Number(match[2]) - 1]} ${match[1]}` : "بدون تاريخ";
}

export function dayCount(n: number) {
  if (n === 1) return "يوم";
  if (n === 2) return "يومين";
  if (n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}

/** "اليوم" / "بعد 3 أيام" / "منذ يومين" for a day offset. */
export function relativeDays(diff: number | null) {
  if (diff == null) return "";
  if (diff === 0) return "اليوم";
  if (diff === 1) return "غداً";
  if (diff === -1) return "أمس";
  return diff > 0 ? `بعد ${dayCount(diff)}` : `منذ ${dayCount(-diff)}`;
}

export function hasArabic(value: string | null | undefined) {
  return /[\u0600-\u06FF]/.test(value ?? "");
}

export function byText(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

export function matches(query: string, ...parts: (string | null | undefined)[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => (part ?? "").toLowerCase().includes(needle));
}

export function isLink(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
