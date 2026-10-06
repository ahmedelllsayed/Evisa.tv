import { siteConfig } from "@/config/site.config";
import { isArabicLocale, t } from "@/lib/i18n";
import type { Destination, VisaType } from "@/lib/types";

const { market } = siteConfig;

function numberLocale(locale?: string) {
  return locale && isArabicLocale(locale) ? "ar-EG" : market.numberLocale;
}

function dateTag(locale?: string) {
  return locale && isArabicLocale(locale) ? "ar-EG" : "en-GB";
}

function timeTag(locale?: string) {
  return locale && isArabicLocale(locale) ? "ar-EG" : "en-US";
}

export function formatMoney(amount: number, currency: string = market.currency, locale?: string) {
  const n = new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 0 }).format(Math.round(amount));
  return `${currency}\u00a0${n}`;
}

export function totalFee(d: Pick<Destination, "govFee" | "serviceFee">) {
  return d.govFee + d.serviceFee;
}

export function guaranteedDate(hours: number, from: Date = new Date()) {
  return new Date(from.getTime() + hours * 36e5);
}

const dtf = (locale: string | undefined, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(dateTag(locale), { timeZone: market.timeZone, ...opts });

/** "30 Sep 2026, 11:56 PM" */
export function formatDateTime(date: Date | string, locale?: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const datePart = dtf(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
  const timePart = new Intl.DateTimeFormat(timeTag(locale), { timeZone: market.timeZone, hour: "numeric", minute: "2-digit" }).format(d);
  return `${datePart}, ${timePart}`;
}

/** "6 Oct 2026" */
export function formatDate(date: Date | string, locale?: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return dtf(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** "6th Oct, 07:09 pm" — Arabic drops the English ordinal suffix. */
export function formatOrdinalShort(date: Date | string, locale?: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const dayNum = Number(dtf(locale, { day: "numeric" }).format(d));
  const suffix =
    locale && isArabicLocale(locale)
      ? ""
      : dayNum % 10 === 1 && dayNum !== 11
        ? "st"
        : dayNum % 10 === 2 && dayNum !== 12
          ? "nd"
          : dayNum % 10 === 3 && dayNum !== 13
            ? "rd"
            : "th";
  const month = dtf(locale, { month: "short" }).format(d);
  const time = new Intl.DateTimeFormat(timeTag(locale), { timeZone: market.timeZone, hour: "2-digit", minute: "2-digit", hour12: true })
    .format(d)
    .toLowerCase();
  return `${dayNum}${suffix} ${month}, ${time}`;
}

/** "6 Oct 2026 at 07:07 PM" */
export function formatAt(date: Date | string, locale?: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const time = new Intl.DateTimeFormat(timeTag(locale), { timeZone: market.timeZone, hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
  const join = locale && isArabicLocale(locale) ? "في" : "at";
  return `${formatDate(d, locale)} ${join} ${time}`;
}

export function processingLabel(hours: number | null, locale?: string) {
  if (hours === null) return "—";
  const ar = Boolean(locale && isArabicLocale(locale));
  if (hours < 1) return ar ? "دقائق" : "minutes";
  if (hours < 24) return ar ? (hours === 1 ? "ساعة" : `${hours} ساعات`) : `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return ar ? (days === 1 ? "يوم" : `${days} أيام`) : `${days} day${days === 1 ? "" : "s"}`;
}

const visaTypeKeys: Record<VisaType, "type.evisa" | "type.sticker" | "type.eta" | "type.free"> = {
  "e-visa": "type.evisa",
  sticker: "type.sticker",
  eta: "type.eta",
  "visa-free": "type.free",
};

export function visaTypeLabel(type: VisaType, locale: string) {
  return t(locale, visaTypeKeys[type]);
}

export const visaTypeLabels: Record<VisaType, string> = {
  "e-visa": "e-Visa",
  sticker: "Sticker",
  eta: "ETA",
  "visa-free": "No visa required",
};

// ----- Homepage filters -----

export const deliveryFilters = [
  { id: "any", label: "Any Time", test: () => true },
  { id: "instant", label: "Instant", test: (h: number) => h <= 1 },
  { id: "24h", label: "Within 24 Hours", test: (h: number) => h > 1 && h <= 24 },
  { id: "3-5", label: "3–5 Days", test: (h: number) => h > 24 && h <= 120 },
  { id: "6-7", label: "6–7 Days", test: (h: number) => h > 120 && h <= 168 },
  { id: "8-30", label: "8–30 Days", test: (h: number) => h > 168 },
] as const;

export const typeFilters = [
  { id: "any", label: "All Visa Types", test: () => true },
  { id: "e-visa", label: "e-Visa", test: (t: VisaType) => t === "e-visa" },
  { id: "sticker", label: "Sticker Visa", test: (t: VisaType) => t === "sticker" },
  { id: "eta", label: "ETA", test: (t: VisaType) => t === "eta" },
] as const;

const only = (docs: string[], allowed: string[]) => docs.every((d) => allowed.includes(d));

export const documentFilters = [
  { id: "any", label: "Any Documents", test: () => true },
  { id: "passport", label: "Only Passport", test: (docs: string[]) => only(docs, ["passport"]) },
  {
    id: "bank",
    label: "Passport & Bank Statements",
    test: (docs: string[]) => docs.includes("bank_statements") && only(docs, ["passport", "photo", "bank_statements"]),
  },
  {
    id: "itr",
    label: "Passport, Bank Statements & Income Tax Return",
    test: (docs: string[]) => docs.includes("income_tax_returns"),
  },
  { id: "schengen", label: "With US/UK/Schengen visa", test: (docs: string[]) => docs.includes("us_uk_schengen_visa") },
] as const;

export type DeliveryFilterId = (typeof deliveryFilters)[number]["id"];
export type TypeFilterId = (typeof typeFilters)[number]["id"];
export type DocumentFilterId = (typeof documentFilters)[number]["id"];

export type HomeFilters = {
  delivery: DeliveryFilterId;
  type: TypeFilterId;
  documents: DocumentFilterId;
  before: string | null;
  query: string;
};

export function matchesFilters(d: Destination, f: HomeFilters, now = new Date()) {
  if (!d.visaRequired) return f.delivery === "any" && f.type === "any" && f.documents === "any" && !f.before;
  const hours = d.processingHours ?? 0;
  if (!deliveryFilters.find((x) => x.id === f.delivery)!.test(hours)) return false;
  if (!typeFilters.find((x) => x.id === f.type)!.test(d.visaType)) return false;
  if (!documentFilters.find((x) => x.id === f.documents)!.test(d.documents)) return false;
  if (f.before && guaranteedDate(hours, now) > new Date(`${f.before}T23:59:59`)) return false;
  return true;
}

export function fillTemplate(text: string, country: string) {
  return text.replaceAll("{country}", country);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
