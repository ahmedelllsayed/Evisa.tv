export const audienceSources = ["customers", "imported", "both"] as const;
export const purchaseFilters = ["any", "none", "once", "repeat", "min"] as const;
export const sexFilters = ["male", "female", "other"] as const;
export const SAMPLE_LIMIT = 40;
export const SEND_BATCH = 20;
export const AUDIENCE_CAP = 2000;

const visaTypes = new Set(["e-visa", "sticker", "eta", "visa-free", "e-voa", "mdac", "custom"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AudienceSource = (typeof audienceSources)[number];
export type PurchaseFilter = (typeof purchaseFilters)[number];
export type SexFilter = (typeof sexFilters)[number];

export type AudienceFilter = {
  source: AudienceSource;
  visaType: string | null;
  sex: SexFilter | null;
  purchases: PurchaseFilter;
  minPurchases: number | null;
  destinationId: string | null;
  nationality: string | null;
  query: string;
};

export type AudienceSelection = {
  all: boolean;
  ids: string[];
};

export type AudiencePerson = {
  id: string;
  email: string;
  name: string;
  kind: "customer" | "imported";
  sex: SexFilter | null;
  purchases: number;
};

export type ImportedContact = {
  email: string;
  name: string | null;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeSex(value: string | null | undefined): SexFilter | null {
  const sex = (value ?? "").trim().toLowerCase();
  if (sex === "m" || sex === "male" || sex === "ذكر") return "male";
  if (sex === "f" || sex === "female" || sex === "أنثى" || sex === "انثى") return "female";
  if (sex === "other" || sex === "آخر") return "other";
  return null;
}

export function cleanAudienceFilter(input: AudienceFilter): { ok: true; filter: AudienceFilter } | { ok: false; error: string } {
  if (!audienceSources.includes(input.source)) return { ok: false, error: "اختر الجمهور." };
  const visaType = input.visaType || null;
  if (visaType && !visaTypes.has(visaType)) return { ok: false, error: "نوع التأشيرة غير معروف." };
  const sex = input.sex || null;
  if (sex && !sexFilters.includes(sex)) return { ok: false, error: "الجنس غير معروف." };
  if (!purchaseFilters.includes(input.purchases)) return { ok: false, error: "اختر عدد الشراء." };
  let minPurchases: number | null = null;
  if (input.purchases === "min") {
    const count = Math.round(Number(input.minPurchases));
    if (!Number.isInteger(count) || count < 1 || count > 1000) return { ok: false, error: "حد الشراء رقم من 1 إلى 1000." };
    minPurchases = count;
  }
  const destinationId = input.destinationId || null;
  if (destinationId && !/^[0-9a-f-]{36}$/i.test(destinationId)) return { ok: false, error: "الوجهة غير معروفة." };
  const nationality = (input.nationality || "").trim().toUpperCase();
  if (nationality && !/^[A-Z]{2}$/.test(nationality)) return { ok: false, error: "الجنسية غير معروفة." };
  return {
    ok: true,
    filter: {
      source: input.source,
      visaType,
      sex,
      purchases: input.purchases,
      minPurchases,
      destinationId,
      nationality: nationality || null,
      query: input.query.trim().slice(0, 80),
    },
  };
}

export function cleanMessage(subject: string, body: string) {
  const cleanSubject = subject.trim().replace(/\s+/g, " ");
  const cleanBody = body.trim();
  if (cleanSubject.length < 2 || cleanSubject.length > 150) return { ok: false as const, error: "اكتب موضوعاً من حرفين إلى 150." };
  if (cleanBody.length < 2 || cleanBody.length > 8000) return { ok: false as const, error: "اكتب نص الرسالة." };
  return { ok: true as const, subject: cleanSubject, body: cleanBody };
}

/** One address per line, `email, name`, or `Name <email>`. A header row is skipped. */
export function parseContactImport(text: string): { contacts: ImportedContact[]; invalid: number } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const start = /^(email|البريد)(\s|,|$)/i.test(lines[0] ?? "") ? 1 : 0;
  const seen = new Set<string>();
  const contacts: ImportedContact[] = [];
  let invalid = 0;
  for (const line of lines.slice(start)) {
    const parsed = parseContactLine(line);
    if (!parsed) {
      invalid += 1;
      continue;
    }
    if (seen.has(parsed.email)) continue;
    seen.add(parsed.email);
    contacts.push(parsed);
  }
  return { contacts, invalid };
}

function parseContactLine(line: string): ImportedContact | null {
  const angle = line.match(/^(.*?)<\s*([^>]+)\s*>\s*$/);
  if (angle) return contactOrNull(angle[2] ?? "", angle[1] ?? "");
  if (line.includes(",") || line.includes(";")) {
    const [first, ...rest] = line.split(/[,;]/);
    const left = (first ?? "").trim();
    const right = rest.join(" ").trim();
    if (emailPattern.test(left)) return contactOrNull(left, right);
    if (emailPattern.test(right)) return contactOrNull(right, left);
    return null;
  }
  return contactOrNull(line, "");
}

function contactOrNull(email: string, name: string): ImportedContact | null {
  const normalized = normalizeEmail(email.replace(/^["']|["']$/g, ""));
  if (!emailPattern.test(normalized) || normalized.length > 200) return null;
  const cleaned = name.replace(/^["']|["']$/g, "").trim();
  return { email: normalized, name: cleaned ? cleaned.slice(0, 120) : null };
}

export function messageWithCoupon(body: string, code: string | null) {
  const text = body.trim();
  if (!code) return text;
  const withCode = text.replaceAll("{{code}}", code);
  if (withCode.includes(code)) return withCode;
  return `${withCode}\n\nرمز الخصم: ${code}`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function marketingBodies(input: { body: string; code: string | null; brand: string; address: string | null; unsubscribeUrl: string }) {
  const message = messageWithCoupon(input.body, input.code);
  const text = [message, "", input.brand, input.address, `إلغاء الاشتراك: ${input.unsubscribeUrl}`].filter((line) => line != null).join("\n");
  const paragraphs = message
    .split(/\n{2,}/)
    .map((part) => `<p style="margin:0 0 12px">${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;padding:24px;font-family:Tahoma,Arial,sans-serif;color:#16182b;line-height:1.6">${paragraphs}<p style="margin-top:24px;color:#5c6570;font-size:12px">${escapeHtml(input.brand)}${input.address ? `<br>${escapeHtml(input.address)}` : ""}<br><a href="${escapeHtml(input.unsubscribeUrl)}">إلغاء الاشتراك</a></p></body></html>`;
  return { text, html };
}
