import { statusLabels } from "@/components/admin/status";
import { statusTone, type Tone } from "@/lib/account-insights";
import { isArabicLocale } from "@/lib/i18n";
import { localizedVisaLabel } from "@/lib/localize";
import type { Application, ApplicationEvent, ApplicationStatus } from "@/lib/types";
import { statusLabel } from "@/components/account/ui";

/** Titles and descriptions written by the system (not by staff), keyed by the stored text. */
const systemTitles: Record<string, [string, string]> = {
  "Application started": ["Application started", "بدأ الطلب"],
  "Payment received": ["Payment received", "تم استلام الدفع"],
  Refunded: ["Refunded", "تم الاسترداد"],
  "Visa file ready": ["Visa file ready", "ملف التأشيرة جاهز"],
  "تغيير نوع التأشيرة": ["Visa type changed", "تغيير نوع التأشيرة"],
};

const systemDescriptions: Record<string, [string, string]> = {
  "Your application is submitted and our team is checking your documents": [
    "Your application is submitted and our team is checking your documents.",
    "قُدّم طلبك ويراجع فريقنا مستنداتك الآن.",
  ],
  "The payment was marked refunded under the refunds policy.": [
    "The payment was refunded under the refunds policy.",
    "أُعيد المبلغ وفق سياسة الاسترداد.",
  ],
  "The issued visa files are available in your account.": [
    "The issued visa files are available on this page.",
    "ملفات التأشيرة الصادرة متاحة في هذه الصفحة.",
  ],
};

function isStatus(value: string | null): value is ApplicationStatus {
  return Boolean(value && value in statusLabels);
}

function statusTitle(event: ApplicationEvent, locale: string) {
  if (!isStatus(event.status)) return null;
  const arabic = statusLabels[event.status];
  const title = event.title.trim();
  if (title === event.status || title === arabic) return statusLabel(locale, event.status);
  if (title === `تحديث الحالة: ${arabic}`) {
    return isArabicLocale(locale) ? title : `Status update: ${statusLabel(locale, event.status)}`;
  }
  return null;
}

function startedDescription(event: ApplicationEvent, app: Application, locale: string, destination: string) {
  const description = event.description?.trim() ?? "";
  if (!isArabicLocale(locale) || !description.startsWith(app.destinationName)) return description;
  const rest = description.slice(app.destinationName.length);
  if (rest && !rest.startsWith(" · ")) return description;
  const visa = rest ? localizedVisaLabel(app, locale) : "";
  return [destination, visa].filter(Boolean).join(" · ");
}

export type TimelineEntry = {
  id: string;
  title: string;
  description: string;
  tone: Tone;
  late: boolean;
  createdAt: string;
};

export function localizeEvent(event: ApplicationEvent, app: Application, locale: string, destination: string): TimelineEntry {
  const pick = (pair: [string, string]) => (isArabicLocale(locale) ? pair[1] : pair[0]);
  const known = systemTitles[event.title.trim()];
  const title = statusTitle(event, locale) ?? (known ? pick(known) : event.title);
  const raw = event.description?.trim() ?? "";
  const description =
    event.title.trim() === "Application started"
      ? startedDescription(event, app, locale, destination)
      : systemDescriptions[raw]
        ? pick(systemDescriptions[raw])
        : raw;
  return {
    id: event.id,
    title,
    description,
    tone: !event.onTime ? "amber" : isStatus(event.status) ? statusTone(event.status) : "brand",
    late: !event.onTime,
    createdAt: event.createdAt,
  };
}
