"use client";

import type { ApplicationGapCount } from "@/lib/account";
import { isUnpaidStatus, targetCountdown } from "@/lib/account-insights";
import { t } from "@/lib/i18n";
import { localizedVisaLabel } from "@/lib/localize";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/visa";
import { Flag, Pill, say } from "@/components/account/ui";
import { destinationName, documentCount, inDays } from "./model";

export type TimingFact = { label: string; value: string; note?: string; late?: boolean; muted?: boolean };

export function timingFact(app: Application, locale: string, now: Date): TimingFact {
  if (isUnpaidStatus(app.status)) {
    return { label: t(locale, "account.guaranteed"), value: say(locale, "Starts after payment", "يبدأ بعد الدفع"), muted: true };
  }
  if (app.status === "approved") {
    return { label: say(locale, "Issued on", "تاريخ الإصدار"), value: formatDate(app.deliveredAt ?? app.updatedAt, locale) };
  }
  if (app.status === "rejected" || app.status === "cancelled" || app.status === "refunded") {
    return { label: say(locale, "Last update", "آخر تحديث"), value: formatDate(app.updatedAt, locale) };
  }
  const countdown = targetCountdown(app.status, app.guaranteedAt, now);
  if (!app.guaranteedAt || !countdown) {
    return { label: t(locale, "account.guaranteed"), value: say(locale, "Being set", "قيد التحديد"), muted: true };
  }
  return {
    label: t(locale, "account.guaranteed"),
    value: formatDate(app.guaranteedAt, locale),
    note: countdown.late ? t(locale, "account.late") : inDays(locale, countdown.days),
    late: countdown.late,
  };
}

export function AppIdentity({ app, locale, size = "md" }: { app: Application; locale: string; size?: "sm" | "md" }) {
  const label = app.visaLabel ? localizedVisaLabel(app, locale) : "";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Flag src={app.destinationFlag} className={size === "sm" ? "size-9" : "size-11"} />
      <div className="min-w-0">
        <p className={cn("truncate font-semibold text-[#16182b]", size === "sm" ? "text-sm" : "text-base")}>{destinationName(app, locale)}</p>
        {label ? <p className="truncate text-xs text-muted-ink">{label}</p> : null}
      </div>
    </div>
  );
}

export function GapBadges({ gap, locale, className }: { gap?: ApplicationGapCount; locale: string; className?: string }) {
  if (!gap || (!gap.rejected && !gap.missing)) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {gap.rejected ? (
        <Pill tone="red" dot>
          {say(locale, `${documentCount(locale, gap.rejected)} rejected`, gap.rejected === 1 ? "مستند مرفوض" : `مرفوض: ${documentCount(locale, gap.rejected)}`)}
        </Pill>
      ) : null}
      {gap.missing ? (
        <Pill tone="amber" dot>
          {say(locale, `${documentCount(locale, gap.missing)} missing`, gap.missing === 1 ? "مستند ناقص" : `ناقص: ${documentCount(locale, gap.missing)}`)}
        </Pill>
      ) : null}
    </div>
  );
}

export function CountBadge({ value, tone = "plain", active }: { value: number | string; tone?: "plain" | "amber" | "red"; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        tone === "amber" && "bg-amber-100 text-amber-800",
        tone === "red" && "bg-rose-100 text-rose-700",
        tone === "plain" && (active ? "bg-brand-100 text-brand-700" : "bg-[#eef0f7] text-muted-ink"),
      )}
    >
      {value}
    </span>
  );
}
