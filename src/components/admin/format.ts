import type { Tone } from "@/components/admin/chrome";

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function egp(amount: number) {
  return `${numberFormat.format(Math.round(amount))} EGP`;
}

export function count(value: number) {
  return numberFormat.format(value);
}

/** "منذ 3 ساعات" relative to `now`. Pass `now` from the server render to keep client output stable. */
export function relativeTime(value: string | Date, now: Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const future = seconds < 0;
  const abs = Math.abs(seconds);
  const unit =
    abs < 60 ? "الآن" : abs < 3600 ? `${Math.round(abs / 60)} د` : abs < 86400 ? `${Math.round(abs / 3600)} س` : `${Math.round(abs / 86400)} يوم`;
  if (unit === "الآن") return unit;
  return future ? `بعد ${unit}` : `منذ ${unit}`;
}

export function shortDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export const statusTone: Record<string, Tone> = {
  draft: "neutral",
  payment_pending: "warning",
  submitted: "info",
  in_review: "info",
  filed: "info",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
  refunded: "warning",
};

export const paymentTone: Record<string, Tone> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

export const paymentLabel: Record<string, string> = {
  paid: "مدفوع",
  pending: "قيد الانتظار",
  failed: "فشل",
  refunded: "مسترد",
};
