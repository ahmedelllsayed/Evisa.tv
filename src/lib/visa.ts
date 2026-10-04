import { siteConfig } from "@/config/site.config";
import type { Destination, VisaType } from "@/lib/types";

const { market } = siteConfig;

export function formatMoney(amount: number, currency: string = market.currency) {
  const n = new Intl.NumberFormat(market.numberLocale, { maximumFractionDigits: 0 }).format(Math.round(amount));
  return `${currency}\u00a0${n}`;
}

export function totalFee(d: Pick<Destination, "govFee" | "serviceFee">) {
  return d.govFee + d.serviceFee;
}

export function guaranteedDate(hours: number, from: Date = new Date()) {
  return new Date(from.getTime() + hours * 36e5);
}

const dtf = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: market.timeZone, ...opts });

/** "30 Sep 2026, 11:56 PM" */
export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const datePart = dtf({ day: "numeric", month: "short", year: "numeric" }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", { timeZone: market.timeZone, hour: "numeric", minute: "2-digit" }).format(d);
  return `${datePart}, ${timePart}`;
}

/** "6 Oct 2026" */
export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return dtf({ day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** "6th Oct, 07:09 pm" */
export function formatOrdinalShort(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const dayNum = Number(dtf({ day: "numeric" }).format(d));
  const suffix = dayNum % 10 === 1 && dayNum !== 11 ? "st" : dayNum % 10 === 2 && dayNum !== 12 ? "nd" : dayNum % 10 === 3 && dayNum !== 13 ? "rd" : "th";
  const month = dtf({ month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: market.timeZone, hour: "2-digit", minute: "2-digit", hour12: true })
    .format(d)
    .toLowerCase();
  return `${dayNum}${suffix} ${month}, ${time}`;
}

/** "6 Oct 2026 at 07:07 PM" */
export function formatAt(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const time = new Intl.DateTimeFormat("en-US", { timeZone: market.timeZone, hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
  return `${formatDate(d)} at ${time}`;
}

export function processingLabel(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return "minutes";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
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
