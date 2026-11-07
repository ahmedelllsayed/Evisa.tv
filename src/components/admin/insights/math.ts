export function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function change(now: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((now - previous) / previous) * 100);
}

export function trend(now: number, previous: number, good: "up" | "down" = "up") {
  const value = change(now, previous);
  return value === null ? null : { value, good };
}

/** Signed point difference, e.g. "+4 نقاط". */
export function pointsLabel(now: number, previous: number) {
  const diff = now - previous;
  if (diff === 0) return "دون تغيير عن الفترة السابقة";
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff)} نقطة عن الفترة السابقة`;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-07" → "07 Nov" */
export function dayLabel(day: string) {
  const [, month, date] = day.split("-");
  const name = months[Number(month) - 1];
  return date && name ? `${date} ${name}` : day;
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** One row per calendar day in the window ending at `end`, filling missing days with `empty(day)`. */
export function fillDays<T extends { day: string }>(rows: T[], days: number, end: Date, empty: (day: string) => T): T[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const keys = new Set<string>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.add(utcDay(new Date(end.getTime() - offset * 86_400_000)));
  }
  for (const row of rows) keys.add(row.day);
  return [...keys].sort().map((day) => byDay.get(day) ?? empty(day));
}
