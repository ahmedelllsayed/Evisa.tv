import { siteConfig } from "@/config/site.config";
import { countryName, flagUrl } from "@/lib/countries";
import { href, visaHref } from "@/lib/href";
import { isArabicLocale } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import { say } from "@/lib/say";
import type { Destination, TravelEvent } from "@/lib/types";
import { processingLabel, visaTypeName } from "@/lib/visa";
import { addDays, daysBetween, relativeDays } from "./format";

/** Extra days on top of the usual processing time when suggesting an "apply by" date. */
export const APPLY_BUFFER_DAYS = 7;

export type ApplyTone = "ok" | "soon" | "tight" | "express" | "late";

export type EventView = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  country: string;
  flag: string;
  startsOn: string;
  month: string;
  dateLabel: string;
  weekday: string;
  dayNumber: string;
  monthShort: string;
  daysAway: number;
  countdown: string;
  image: string | null;
  visa:
    | { status: "free"; label: string }
    | { status: "required"; label: string; type: string; href: string; linkLabel: string }
    | { status: "unknown"; label: string; href: string; linkLabel: string };
  apply: { tone: ApplyTone; title: string; detail: string; date: string | null } | null;
  calendar: { summary: string; location: string; description: string; path: string | null; applySummary: string | null };
};

export type EventOption = { value: string; label: string; count: number };

function dateParts(locale: string) {
  const tag = isArabicLocale(locale) ? "ar-EG-u-nu-latn" : "en-GB";
  const make = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { timeZone: siteConfig.market.timeZone, ...opts });
  const full = make({ day: "numeric", month: "long", year: "numeric" });
  const weekday = make({ weekday: "long" });
  const day = make({ day: "numeric" });
  const monthShort = make({ month: "short" });
  const monthLong = make({ month: "long", year: "numeric" });
  const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
  return {
    full: (iso: string) => full.format(at(iso)),
    weekday: (iso: string) => weekday.format(at(iso)),
    day: (iso: string) => day.format(at(iso)),
    monthShort: (iso: string) => monthShort.format(at(iso)),
    month: (iso: string) => monthLong.format(at(iso)),
  };
}

function applyPlan(dest: Destination, startsOn: string, today: string, locale: string, fmt: (iso: string) => string): EventView["apply"] {
  if (!dest.visaRequired || dest.processingHours == null) return null;
  const processingDays = Math.max(1, Math.ceil(dest.processingHours / 24));
  const processing = processingLabel(dest.processingHours, locale);
  const date = addDays(startsOn, -(processingDays + APPLY_BUFFER_DAYS));
  const left = daysBetween(today, date);
  const untilEvent = daysBetween(today, startsOn);
  const basis = say(
    locale,
    `Usual processing ${processing} plus a ${APPLY_BUFFER_DAYS}-day margin.`,
    `المعالجة المعتادة ${processing} مع ${APPLY_BUFFER_DAYS} أيام احتياط.`,
  );
  if (left > 7) {
    return { tone: "ok", date, title: say(locale, `Apply by ${fmt(date)}`, `قدّم قبل ${fmt(date)}`), detail: basis };
  }
  if (left >= 0) {
    const when = left === 0 ? say(locale, "today", "اليوم") : relativeDays(locale, left);
    return { tone: "soon", date, title: say(locale, `Apply by ${fmt(date)}`, `قدّم قبل ${fmt(date)}`), detail: say(locale, `That is ${when.toLowerCase()}. ${basis}`, `الموعد ${when}. ${basis}`) };
  }
  if (untilEvent >= processingDays) {
    return {
      tone: "tight",
      date: null,
      title: say(locale, "Apply now", "قدّم الآن"),
      detail: say(locale, `There is still time for the usual ${processing} processing, but no margin left.`, `الوقت يكفي للمعالجة المعتادة (${processing}) لكن بلا هامش احتياط.`),
    };
  }
  if (dest.expressHours != null && untilEvent >= Math.max(1, Math.ceil(dest.expressHours / 24))) {
    return {
      tone: "express",
      date: null,
      title: say(locale, "Express only", "الخدمة السريعة فقط"),
      detail: say(locale, `Usual processing (${processing}) is longer than the time left. Express takes about ${processingLabel(dest.expressHours, locale)}.`, `المعالجة المعتادة (${processing}) أطول من الوقت المتبقي. السريعة تستغرق نحو ${processingLabel(dest.expressHours, locale)}.`),
    };
  }
  return {
    tone: "late",
    date: null,
    title: say(locale, "Probably too late", "الوقت لا يكفي غالباً"),
    detail: say(locale, `Usual processing takes ${processing}, longer than the time left before the event.`, `المعالجة المعتادة ${processing}، أطول من الوقت المتبقي قبل الفعالية.`),
  };
}

export function buildEvents(events: TravelEvent[], destinations: Destination[], locale: string, today: string) {
  const fmt = dateParts(locale);
  const byCode = new Map(destinations.map((d) => [d.code, d]));
  const byId = new Map(destinations.map((d) => [d.id, d]));
  const items: EventView[] = events
    .filter((event) => event.startsOn && event.startsOn >= today)
    .sort((a, b) => (a.startsOn < b.startsOn ? -1 : a.startsOn > b.startsOn ? 1 : 0))
    .map((event) => {
      const dest = (event.destinationId ? byId.get(event.destinationId) : undefined) ?? byCode.get(event.countryCode);
      const country = dest ? localizedDestinationName(dest, locale) : countryName(event.countryCode, locale);
      const daysAway = daysBetween(today, event.startsOn);
      const visa: EventView["visa"] = !dest
        ? {
            status: "unknown",
            label: say(locale, "Check the entry rules for an Egyptian passport", "تحقق من شروط الدخول بجواز مصري"),
            href: href("/tools/visa-requirements", locale),
            linkLabel: say(locale, "Check requirements", "افحص المتطلبات"),
          }
        : dest.visaRequired
          ? {
              status: "required",
              label: say(locale, "Egyptian passport: visa needed", "جواز مصري: تحتاج تأشيرة"),
              type: visaTypeName(dest, locale),
              href: visaHref(dest.slug, locale),
              linkLabel: say(locale, `Get the ${country} visa`, `تأشيرة ${country}`),
            }
          : { status: "free", label: say(locale, "Egyptian passport: no visa needed", "جواز مصري: لا تحتاج تأشيرة") };
      const apply = dest ? applyPlan(dest, event.startsOn, today, locale, fmt.full) : null;
      const visaLine =
        visa.status === "required"
          ? say(locale, `Visa needed for ${country} on an Egyptian passport.`, `تحتاج تأشيرة لدخول ${country} بجواز مصري.`)
          : visa.status === "free"
            ? say(locale, `No visa needed for ${country} on an Egyptian passport.`, `لا تحتاج تأشيرة لدخول ${country} بجواز مصري.`)
            : "";
      return {
        id: event.id,
        name: event.name,
        city: event.city,
        countryCode: event.countryCode,
        country,
        flag: flagUrl(event.countryCode, 40),
        startsOn: event.startsOn,
        month: event.startsOn.slice(0, 7),
        dateLabel: fmt.full(event.startsOn),
        weekday: fmt.weekday(event.startsOn),
        dayNumber: fmt.day(event.startsOn),
        monthShort: fmt.monthShort(event.startsOn),
        daysAway,
        countdown: relativeDays(locale, daysAway),
        image: event.image || dest?.image || dest?.heroImage || null,
        visa,
        apply,
        calendar: {
          summary: event.name,
          location: `${event.city}${say(locale, ", ", "، ")}${country}`,
          description: [visaLine, apply?.date ? `${apply.title}.` : ""].filter(Boolean).join("\n"),
          path: visa.status === "required" ? visa.href : null,
          applySummary:
            apply?.date && visa.status === "required"
              ? say(locale, `Apply for the ${country} visa (${event.name})`, `قدّم على تأشيرة ${country} (${event.name})`)
              : null,
        },
      };
    });

  const countries = new Map<string, EventOption>();
  const months = new Map<string, EventOption>();
  for (const item of items) {
    const c = countries.get(item.countryCode) ?? { value: item.countryCode, label: item.country, count: 0 };
    c.count += 1;
    countries.set(item.countryCode, c);
    const m = months.get(item.month) ?? { value: item.month, label: fmt.month(item.startsOn), count: 0 };
    m.count += 1;
    months.set(item.month, m);
  }
  const collator = new Intl.Collator(isArabicLocale(locale) ? "ar" : "en");
  return {
    items,
    countries: [...countries.values()].sort((a, b) => collator.compare(a.label, b.label)),
    months: [...months.values()],
  };
}
