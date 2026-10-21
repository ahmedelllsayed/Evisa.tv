import "server-only";
import { siteConfig } from "@/config/site.config";
import { countries } from "@/lib/countries";
import { safePublicUrl } from "@/lib/safe-path";
import { json, one, sql } from "./db";

export type SiteExtras = {
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  ogImage: string;
  favicon: string;
  social: string;
  showFaq: boolean;
  showReviews: boolean;
  showStats: boolean;
  showEvents: boolean;
  showMap: boolean;
  announcementEn: string;
  announcementAr: string;
  gaMeasurementId: string;
  consentEnabled: boolean;
  consentTextEn: string;
  consentTextAr: string;
  maintenance: boolean;
  paymobIntegrationId: string;
  offerTitleEn: string;
  offerTitleAr: string;
  offerUrl: string;
  offerNoteEn: string;
  offerNoteAr: string;
  reservationFlightFee: number;
  reservationHotelFee: number;
  reservationItineraryFee: number;
  reservationInsuranceFee: number;
  reservationFlightOn: boolean;
  reservationHotelOn: boolean;
  reservationItineraryOn: boolean;
  reservationInsuranceOn: boolean;
  reservationFaqFlightQAr: string;
  reservationFaqFlightAAr: string;
  reservationFaqFlightQEn: string;
  reservationFaqFlightAEn: string;
  reservationFaqHotelQAr: string;
  reservationFaqHotelAAr: string;
  reservationFaqHotelQEn: string;
  reservationFaqHotelAEn: string;
  reservationFaqItineraryQAr: string;
  reservationFaqItineraryAAr: string;
  reservationFaqItineraryQEn: string;
  reservationFaqItineraryAEn: string;
  reservationFaqInsuranceQAr: string;
  reservationFaqInsuranceAAr: string;
  reservationFaqInsuranceQEn: string;
  reservationFaqInsuranceAEn: string;
};

export type SiteSettings = {
  name: string;
  legalName: string;
  description: string;
  tagline: string;
  generalEmail: string;
  supportEmail: string;
  pressEmail: string;
  partnershipsEmail: string;
  phone: string;
  whatsapp: string;
  offices: { city: string; address: string }[];
  approvalRate: number;
  approvalOverall: number;
  bookingUrl: string;
  logoUrl: string;
  extras: SiteExtras;
};

export function defaultExtras(): SiteExtras {
  return {
    seoTitleEn: siteConfig.seoTitle,
    seoTitleAr: "طلبات التأشيرة للجواز المصري",
    seoDescriptionEn: siteConfig.description,
    seoDescriptionAr: "خطّط لطلب التأشيرة وتابعه.",
    ogImage: "",
    favicon: "",
    social: "",
    showFaq: false,
    showReviews: false,
    showStats: false,
    showEvents: siteConfig.features.events,
    showMap: siteConfig.features.mapView,
    announcementEn: "",
    announcementAr: "",
    gaMeasurementId: "",
    consentEnabled: true,
    consentTextEn: "We use cookies to measure visits. You can refuse.",
    consentTextAr: "نستخدم الكوكيز لقياس الزيارات. يمكنك الرفض.",
    maintenance: false,
    paymobIntegrationId: "",
    offerTitleEn: "",
    offerTitleAr: "",
    offerUrl: "",
    offerNoteEn: "",
    offerNoteAr: "",
    reservationFlightFee: 499,
    reservationHotelFee: 399,
    reservationItineraryFee: 199,
    reservationInsuranceFee: 149,
    reservationFlightOn: true,
    reservationHotelOn: true,
    reservationItineraryOn: true,
    reservationInsuranceOn: true,
    reservationFaqFlightQAr: "هل الملف تذكرة طيران؟",
    reservationFaqFlightAAr: "لا. يعرض جدول الرحلة المنشور فقط.",
    reservationFaqFlightQEn: "Is this an airline ticket?",
    reservationFaqFlightAEn: "No. It shows the published schedule only.",
    reservationFaqHotelQAr: "هل الفندق محجوز؟",
    reservationFaqHotelAAr: "لا. يعرض فندقاً حقيقياً وسعره المنشور.",
    reservationFaqHotelQEn: "Is the hotel booked?",
    reservationFaqHotelAEn: "No. It shows a real property and its published rate.",
    reservationFaqItineraryQAr: "بأي لغة يُكتب البرنامج؟",
    reservationFaqItineraryAAr: "بالإنجليزية، لملف التأشيرة.",
    reservationFaqItineraryQEn: "Which language is the itinerary?",
    reservationFaqItineraryAEn: "English, for the visa file.",
    reservationFaqInsuranceQAr: "هل تُنشأ وثيقة جديدة؟",
    reservationFaqInsuranceAAr: "لا. تُستخرج وثيقتك الموجودة برقم الوثيقة ورقم الجواز.",
    reservationFaqInsuranceQEn: "Is a new policy created?",
    reservationFaqInsuranceAEn: "No. Your existing policy is fetched by its number and your passport number.",
  };
}

function clip(value: unknown, fallback: string, max: number) {
  if (value === undefined || value === null) return fallback.slice(0, max);
  return String(value).trim().slice(0, max);
}

function fee(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return fallback;
  return Math.round(n);
}

function readExtras(value: unknown): SiteExtras {
  const base = defaultExtras();
  const raw = json<Partial<SiteExtras>>(value, {});
  return {
    ...base,
    ...raw,
    showFaq: raw.showFaq ?? base.showFaq,
    showReviews: raw.showReviews ?? base.showReviews,
    showStats: raw.showStats ?? base.showStats,
    showEvents: raw.showEvents ?? base.showEvents,
    showMap: raw.showMap ?? base.showMap,
    consentEnabled: raw.consentEnabled ?? base.consentEnabled,
    maintenance: raw.maintenance ?? base.maintenance,
    gaMeasurementId: String(raw.gaMeasurementId ?? "").trim(),
    paymobIntegrationId: String(raw.paymobIntegrationId ?? "").replace(/\D/g, ""),
    offerTitleEn: String(raw.offerTitleEn ?? "").trim().slice(0, 80),
    offerTitleAr: String(raw.offerTitleAr ?? "").trim().slice(0, 80),
    offerUrl: safePublicUrl(String(raw.offerUrl ?? "")),
    offerNoteEn: String(raw.offerNoteEn ?? "").trim().slice(0, 180),
    offerNoteAr: String(raw.offerNoteAr ?? "").trim().slice(0, 180),
    reservationFlightFee: fee(raw.reservationFlightFee, base.reservationFlightFee),
    reservationHotelFee: fee(raw.reservationHotelFee, base.reservationHotelFee),
    reservationItineraryFee: fee(raw.reservationItineraryFee, base.reservationItineraryFee),
    reservationInsuranceFee: fee(raw.reservationInsuranceFee, base.reservationInsuranceFee),
    reservationFlightOn: raw.reservationFlightOn ?? base.reservationFlightOn,
    reservationHotelOn: raw.reservationHotelOn ?? base.reservationHotelOn,
    reservationItineraryOn: raw.reservationItineraryOn ?? base.reservationItineraryOn,
    reservationInsuranceOn: raw.reservationInsuranceOn ?? base.reservationInsuranceOn,
    reservationFaqFlightQAr: clip(raw.reservationFaqFlightQAr, base.reservationFaqFlightQAr, 160),
    reservationFaqFlightAAr: clip(raw.reservationFaqFlightAAr, base.reservationFaqFlightAAr, 400),
    reservationFaqFlightQEn: clip(raw.reservationFaqFlightQEn, base.reservationFaqFlightQEn, 160),
    reservationFaqFlightAEn: clip(raw.reservationFaqFlightAEn, base.reservationFaqFlightAEn, 400),
    reservationFaqHotelQAr: clip(raw.reservationFaqHotelQAr, base.reservationFaqHotelQAr, 160),
    reservationFaqHotelAAr: clip(raw.reservationFaqHotelAAr, base.reservationFaqHotelAAr, 400),
    reservationFaqHotelQEn: clip(raw.reservationFaqHotelQEn, base.reservationFaqHotelQEn, 160),
    reservationFaqHotelAEn: clip(raw.reservationFaqHotelAEn, base.reservationFaqHotelAEn, 400),
    reservationFaqItineraryQAr: clip(raw.reservationFaqItineraryQAr, base.reservationFaqItineraryQAr, 160),
    reservationFaqItineraryAAr: clip(raw.reservationFaqItineraryAAr, base.reservationFaqItineraryAAr, 400),
    reservationFaqItineraryQEn: clip(raw.reservationFaqItineraryQEn, base.reservationFaqItineraryQEn, 160),
    reservationFaqItineraryAEn: clip(raw.reservationFaqItineraryAEn, base.reservationFaqItineraryAEn, 400),
    reservationFaqInsuranceQAr: clip(raw.reservationFaqInsuranceQAr, base.reservationFaqInsuranceQAr, 160),
    reservationFaqInsuranceAAr: clip(raw.reservationFaqInsuranceAAr, base.reservationFaqInsuranceAAr, 400),
    reservationFaqInsuranceQEn: clip(raw.reservationFaqInsuranceQEn, base.reservationFaqInsuranceQEn, 160),
    reservationFaqInsuranceAEn: clip(raw.reservationFaqInsuranceAEn, base.reservationFaqInsuranceAEn, 400),
  };
}

function fromConfig(): SiteSettings {
  return {
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    description: siteConfig.description,
    tagline: siteConfig.tagline,
    generalEmail: siteConfig.contact.generalEmail,
    supportEmail: siteConfig.contact.supportEmail,
    pressEmail: siteConfig.contact.pressEmail,
    partnershipsEmail: siteConfig.contact.partnershipsEmail,
    phone: siteConfig.contact.phone,
    whatsapp: siteConfig.contact.whatsapp,
    offices: siteConfig.contact.offices.map((office) => ({ city: office.city, address: office.address })),
    approvalRate: 96.7,
    approvalOverall: 75.3,
    bookingUrl: "",
    logoUrl: "",
    extras: defaultExtras(),
  };
}

function rate(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 10) / 10)) : fallback;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await one(
    `select name, legal_name, description, tagline, general_email, support_email, press_email, partnerships_email,
            phone, whatsapp, offices, approval_rate, approval_overall, booking_url, logo_url, extras
     from site_settings where id = 1`,
  );
  if (!row) return fromConfig();
  const offices = json<{ city?: string; address?: string }[]>(row.offices, []);
  return {
    name: String(row.name || siteConfig.name).trim() || siteConfig.name,
    legalName: String(row.legal_name || siteConfig.legalName),
    description: String(row.description || siteConfig.description),
    tagline: String(row.tagline || siteConfig.tagline),
    generalEmail: String(row.general_email || ""),
    supportEmail: String(row.support_email || ""),
    pressEmail: String(row.press_email || ""),
    partnershipsEmail: String(row.partnerships_email || ""),
    phone: String(row.phone || ""),
    whatsapp: String(row.whatsapp || ""),
    offices: offices
      .filter((office) => office.city && office.address)
      .map((office) => ({ city: String(office.city), address: String(office.address) })),
    approvalRate: rate(row.approval_rate, 96.7),
    approvalOverall: rate(row.approval_overall, 75.3),
    bookingUrl: String(row.booking_url || ""),
    logoUrl: String(row.logo_url || ""),
    extras: readExtras(row.extras),
  };
}

const knownCountries = new Set(countries.map((country) => country.code));

export function normalizeCitizenshipCodes(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map((code) => String(code).toUpperCase()).filter((code) => knownCountries.has(code)))];
}

/** Empty means every country stays visible in the citizenship picker. */
export async function getCitizenshipCodes(): Promise<string[]> {
  const row = await one("select citizenship_codes from site_settings where id = 1");
  if (!row) return [];
  return normalizeCitizenshipCodes(row.citizenship_codes);
}

export async function saveCitizenshipCodes(codes: string[]) {
  const clean = normalizeCitizenshipCodes(codes);
  await sql(`update site_settings set citizenship_codes = $1::jsonb, updated_at = now() where id = 1`, [JSON.stringify(clean)]);
}

export async function saveSiteSettings(input: SiteSettings) {
  await sql(
    `insert into site_settings (
       id, name, legal_name, description, tagline, general_email, support_email, press_email, partnerships_email, phone, whatsapp, offices, approval_rate, approval_overall, booking_url, logo_url, extras, updated_at
     ) values (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16::jsonb, now())
     on conflict (id) do update set
       name=excluded.name, legal_name=excluded.legal_name, description=excluded.description, tagline=excluded.tagline,
       general_email=excluded.general_email, support_email=excluded.support_email, press_email=excluded.press_email,
       partnerships_email=excluded.partnerships_email, phone=excluded.phone, whatsapp=excluded.whatsapp,
       offices=excluded.offices, approval_rate=excluded.approval_rate, approval_overall=excluded.approval_overall,
       booking_url=excluded.booking_url, logo_url=excluded.logo_url, extras=excluded.extras, updated_at=now()`,
    [
      input.name.trim() || siteConfig.name, input.legalName, input.description, input.tagline, input.generalEmail, input.supportEmail,
      input.pressEmail, input.partnershipsEmail, input.phone, safePublicUrl(input.whatsapp), JSON.stringify(input.offices),
      rate(input.approvalRate, 96.7), rate(input.approvalOverall, 75.3), safePublicUrl(input.bookingUrl), input.logoUrl.trim(),
      JSON.stringify(input.extras ?? defaultExtras()),
    ],
  );
}
