import { normalizePhone } from "./phone.ts";

export const channels = ["email", "sms", "whatsapp"] as const;
export const audienceSources = ["customers", "imported", "both"] as const;
export const purchaseFilters = ["any", "none", "once", "repeat", "min"] as const;
export const sexFilters = ["male", "female", "other"] as const;
export const lastPurchaseFilters = ["any", "within", "before"] as const;
export const yesNo = ["any", "yes", "no"] as const;
export const SAMPLE_LIMIT = 40;
export const AUDIENCE_CAP = 5000;

const visaTypes = new Set(["e-visa", "sticker", "eta", "visa-free", "e-voa", "mdac", "custom"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f-]{36}$/i;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export type Channel = (typeof channels)[number];
export type AudienceSource = (typeof audienceSources)[number];
export type PurchaseFilter = (typeof purchaseFilters)[number];
export type SexFilter = (typeof sexFilters)[number];
export type LastPurchaseFilter = (typeof lastPurchaseFilters)[number];
export type YesNo = (typeof yesNo)[number];

export type AudienceFilter = {
  source: AudienceSource;
  listIds: string[];
  visaType: string | null;
  sex: SexFilter | null;
  purchases: PurchaseFilter;
  minPurchases: number | null;
  lastPurchase: LastPurchaseFilter;
  lastPurchaseDays: number | null;
  minSpent: number | null;
  joinedFrom: string | null;
  joinedTo: string | null;
  destinationId: string | null;
  nationality: string | null;
  locale: "ar" | "en" | null;
  hasUnpaid: YesNo;
  hasPhone: YesNo;
  usedCoupon: YesNo;
  referred: YesNo;
  query: string;
};

export type AudiencePerson = {
  id: string;
  kind: "customer" | "imported";
  email: string | null;
  phone: string | null;
  name: string;
  locale: string | null;
  sex: SexFilter | null;
  purchases: number;
};

export type ImportedContact = {
  email: string | null;
  phone: string | null;
  name: string | null;
};

export const emptyFilter: AudienceFilter = {
  source: "customers",
  listIds: [],
  visaType: null,
  sex: null,
  purchases: "any",
  minPurchases: 2,
  lastPurchase: "any",
  lastPurchaseDays: 90,
  minSpent: null,
  joinedFrom: null,
  joinedTo: null,
  destinationId: null,
  nationality: null,
  locale: null,
  hasUnpaid: "any",
  hasPhone: "any",
  usedCoupon: "any",
  referred: "any",
  query: "",
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function emailOk(value: string) {
  return emailPattern.test(value) && value.length <= 200;
}

export function normalizeSex(value: string | null | undefined): SexFilter | null {
  const sex = (value ?? "").trim().toLowerCase();
  if (sex === "m" || sex === "male" || sex === "ذكر") return "male";
  if (sex === "f" || sex === "female" || sex === "أنثى" || sex === "انثى") return "female";
  if (sex === "other" || sex === "آخر") return "other";
  return null;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function wholeOrNull(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

/** Fills missing keys so filters saved by older versions keep working. */
export function cleanAudienceFilter(input: Partial<AudienceFilter> | null | undefined): { ok: true; filter: AudienceFilter } | { ok: false; error: string } {
  const raw = { ...emptyFilter, ...(input ?? {}) };
  const visaType = raw.visaType || null;
  if (visaType && !visaTypes.has(visaType)) return { ok: false, error: "نوع التأشيرة غير معروف." };
  const sex = raw.sex || null;
  if (sex && !sexFilters.includes(sex)) return { ok: false, error: "الجنس غير معروف." };
  const purchases = pick(raw.purchases, purchaseFilters, "any");
  let minPurchases: number | null = null;
  if (purchases === "min") {
    const count = wholeOrNull(raw.minPurchases, 1, 1000);
    if (count == null) return { ok: false, error: "حد الشراء رقم من 1 إلى 1000." };
    minPurchases = count;
  }
  const lastPurchase = pick(raw.lastPurchase, lastPurchaseFilters, "any");
  let lastPurchaseDays: number | null = null;
  if (lastPurchase !== "any") {
    const days = wholeOrNull(raw.lastPurchaseDays, 1, 3650);
    if (days == null) return { ok: false, error: "عدد أيام آخر شراء من 1 إلى 3650." };
    lastPurchaseDays = days;
  }
  const minSpent = wholeOrNull(raw.minSpent, 1, 100_000_000);
  if (minSpent === undefined) return { ok: false, error: "إجمالي المدفوع رقم أكبر من صفر." };
  const joinedFrom = raw.joinedFrom && dayPattern.test(raw.joinedFrom) ? raw.joinedFrom : null;
  const joinedTo = raw.joinedTo && dayPattern.test(raw.joinedTo) ? raw.joinedTo : null;
  if (joinedFrom && joinedTo && joinedTo < joinedFrom) return { ok: false, error: "تاريخ نهاية التسجيل قبل بدايته." };
  const destinationId = raw.destinationId || null;
  if (destinationId && !uuidPattern.test(destinationId)) return { ok: false, error: "الوجهة غير معروفة." };
  const nationality = (raw.nationality || "").trim().toUpperCase();
  if (nationality && !/^[A-Z]{2}$/.test(nationality)) return { ok: false, error: "الجنسية غير معروفة." };
  const listIds = Array.isArray(raw.listIds) ? [...new Set(raw.listIds.filter((id) => typeof id === "string" && uuidPattern.test(id)))] : [];
  return {
    ok: true,
    filter: {
      source: pick(raw.source, audienceSources, "customers"),
      listIds,
      visaType,
      sex,
      purchases,
      minPurchases,
      lastPurchase,
      lastPurchaseDays,
      minSpent: minSpent ?? null,
      joinedFrom,
      joinedTo,
      destinationId,
      nationality: nationality || null,
      locale: raw.locale === "ar" || raw.locale === "en" ? raw.locale : null,
      hasUnpaid: pick(raw.hasUnpaid, yesNo, "any"),
      hasPhone: pick(raw.hasPhone, yesNo, "any"),
      usedCoupon: pick(raw.usedCoupon, yesNo, "any"),
      referred: pick(raw.referred, yesNo, "any"),
      query: String(raw.query ?? "").trim().slice(0, 80),
    },
  };
}

/** Short Arabic description of a filter, for lists of segments and campaigns. */
export function describeFilter(filter: AudienceFilter, names: { lists?: Record<string, string>; destinations?: Record<string, string> } = {}) {
  const parts: string[] = [];
  if (filter.source === "imported") parts.push("الجهات المستوردة");
  else if (filter.source === "both") parts.push("العملاء والجهات المستوردة");
  else parts.push("العملاء");
  if (filter.source !== "customers" && filter.listIds.length) {
    parts.push(`القوائم: ${filter.listIds.map((id) => names.lists?.[id] ?? "قائمة").join("، ")}`);
  }
  if (filter.source !== "imported") {
    if (filter.visaType) parts.push(`نوع ${filter.visaType}`);
    if (filter.sex) parts.push(filter.sex === "male" ? "ذكور" : filter.sex === "female" ? "إناث" : "جنس آخر");
    if (filter.purchases === "none") parts.push("لم يشترِ");
    if (filter.purchases === "once") parts.push("اشترى مرة");
    if (filter.purchases === "repeat") parts.push("متكرر");
    if (filter.purchases === "min") parts.push(`اشترى ${filter.minPurchases}+ مرات`);
    if (filter.lastPurchase === "within") parts.push(`اشترى خلال ${filter.lastPurchaseDays} يوماً`);
    if (filter.lastPurchase === "before") parts.push(`لم يشترِ منذ ${filter.lastPurchaseDays} يوماً`);
    if (filter.minSpent) parts.push(`دفع ${filter.minSpent}+`);
    if (filter.joinedFrom || filter.joinedTo) parts.push(`سجّل ${filter.joinedFrom ?? "…"} إلى ${filter.joinedTo ?? "…"}`);
    if (filter.destinationId) parts.push(`وجهة ${names.destinations?.[filter.destinationId] ?? ""}`.trim());
    if (filter.nationality) parts.push(`جنسية ${filter.nationality}`);
    if (filter.locale) parts.push(filter.locale === "ar" ? "يتصفح بالعربية" : "يتصفح بالإنجليزية");
    if (filter.hasUnpaid !== "any") parts.push(filter.hasUnpaid === "yes" ? "لديه طلب غير مدفوع" : "ليس لديه طلب غير مدفوع");
    if (filter.hasPhone !== "any") parts.push(filter.hasPhone === "yes" ? "لديه هاتف" : "بلا هاتف");
    if (filter.usedCoupon !== "any") parts.push(filter.usedCoupon === "yes" ? "استخدم كوبوناً" : "لم يستخدم كوبوناً");
    if (filter.referred !== "any") parts.push(filter.referred === "yes" ? "جاء بإحالة" : "بلا إحالة");
  }
  if (filter.query) parts.push(`بحث «${filter.query}»`);
  return parts.join(" · ");
}

/** One contact per line: an email, a phone, and a name in any order, or `Name <email>`. A header row is skipped. */
export function parseContactImport(text: string): { contacts: ImportedContact[]; invalid: number } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const start = /^(email|phone|name|البريد|الهاتف|الاسم)(\s|,|;|\t|$)/i.test(lines[0] ?? "") ? 1 : 0;
  const seen = new Set<string>();
  const contacts: ImportedContact[] = [];
  let invalid = 0;
  for (const line of lines.slice(start)) {
    const parsed = parseContactLine(line);
    if (!parsed) {
      invalid += 1;
      continue;
    }
    const key = parsed.email ?? parsed.phone ?? "";
    if (seen.has(key)) continue;
    seen.add(key);
    contacts.push(parsed);
  }
  return { contacts, invalid };
}

function clean(value: string) {
  return value.replace(/^["']|["']$/g, "").trim();
}

function parseContactLine(line: string): ImportedContact | null {
  const angle = line.match(/^(.*?)<\s*([^>]+)\s*>(.*)$/);
  const parts = angle ? [angle[1] ?? "", angle[2] ?? "", angle[3] ?? ""] : line.split(/[,;\t]/);
  let email: string | null = null;
  let phone: string | null = null;
  const names: string[] = [];
  for (const part of parts.map(clean).filter(Boolean)) {
    const lower = normalizeEmail(part);
    if (!email && emailOk(lower)) {
      email = lower;
      continue;
    }
    const asPhone = /^[+\d][\d\s\-().]{6,}$/.test(part) ? normalizePhone(part) : null;
    if (!phone && asPhone) {
      phone = asPhone;
      continue;
    }
    if (part.includes("@") || /^[+\d][\d\s\-().]{6,}$/.test(part)) return null;
    names.push(part);
  }
  if (!email && !phone) return null;
  const name = names.join(" ").trim();
  return { email, phone, name: name ? name.slice(0, 120) : null };
}
