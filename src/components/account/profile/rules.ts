import { passportHealth, profileChecklist, type PassportHealth, type ProfileItem } from "@/lib/account-insights";
import { countries } from "@/lib/countries";
import { isArabicLocale } from "@/lib/i18n";
import { siteConfig } from "@/config/site.config";

export const profileFields = ["firstName", "lastName", "phone", "sex", "dateOfBirth", "nationality", "passportNumber", "passportExpiry"] as const;
export type ProfileField = (typeof profileFields)[number];
export type ProfileValues = Record<ProfileField, string>;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const sexOptions = ["female", "male", "other"] as const;

const countryCodes = new Set(countries.map((country) => country.code));
const latinName = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F' .-]*$/u;
const phoneChars = /^\+?[\d\s\-().]+$/;
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

function pick(locale: string, en: string, ar: string) {
  return isArabicLocale(locale) ? ar : en;
}

/** Calendar day in the market timezone. Call on the server and pass the result down. */
export function marketToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.market.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isRealDay(value: string) {
  if (!isoDay.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function shiftYears(iso: string, years: number) {
  return `${String(Number(iso.slice(0, 4)) + years).padStart(4, "0")}${iso.slice(4)}`;
}

export function shiftDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const months = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

/** Same output on server and browser, unlike Intl date formatting. */
export function formatDay(iso: string, locale: string) {
  if (!isRealDay(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${months[isArabicLocale(locale) ? "ar" : "en"][month - 1]} ${year}`;
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function cleanPassport(value: string) {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

function cleanPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

export function readProfileForm(formData: FormData): ProfileValues {
  const values = {} as ProfileValues;
  for (const field of profileFields) values[field] = String(formData.get(field) ?? "");
  return values;
}

export function normalizeProfile(values: ProfileValues): ProfileValues {
  return {
    firstName: cleanName(values.firstName),
    lastName: cleanName(values.lastName),
    phone: cleanPhone(values.phone),
    sex: values.sex.trim(),
    dateOfBirth: values.dateOfBirth.trim(),
    nationality: values.nationality.trim().toUpperCase(),
    passportNumber: cleanPassport(values.passportNumber),
    passportExpiry: values.passportExpiry.trim(),
  };
}

function nameError(value: string, locale: string, empty: [string, string]) {
  const name = cleanName(value);
  if (!name) return pick(locale, ...empty);
  if (name.length > 50) return pick(locale, "Keep it under 50 characters", "الحد الأقصى 50 حرفاً");
  if (!latinName.test(name)) return pick(locale, "Use English letters as in your passport", "اكتبه بالحروف الإنجليزية كما في الجواز");
  return undefined;
}

/** Shared by the form and the server action so both refuse the same input. */
export function profileErrors(raw: ProfileValues, today: string, locale: string): ProfileErrors {
  const values = normalizeProfile(raw);
  const errors: ProfileErrors = {};
  const invalidDate = pick(locale, "Enter a valid date", "اكتب تاريخاً صحيحاً");
  const checkYear = pick(locale, "Check the year", "راجع السنة");

  errors.firstName = nameError(values.firstName, locale, ["Enter your first name", "اكتب اسمك الأول"]);
  errors.lastName = nameError(values.lastName, locale, ["Enter your last name", "اكتب اسم العائلة"]);

  const digits = values.phone.replace(/\D/g, "").length;
  if (raw.phone.trim() && (!phoneChars.test(raw.phone.trim()) || digits < 8 || digits > 15)) {
    errors.phone = pick(locale, "Use 8 to 15 digits, + is optional", "من 8 إلى 15 رقماً، ويمكن البدء بـ +");
  }

  if (values.sex && !(sexOptions as readonly string[]).includes(values.sex)) errors.sex = pick(locale, "Choose from the list", "اختر من القائمة");

  if (values.dateOfBirth) {
    if (!isRealDay(values.dateOfBirth)) errors.dateOfBirth = invalidDate;
    else if (values.dateOfBirth >= today) errors.dateOfBirth = pick(locale, "Must be a date in the past", "يجب أن يكون تاريخاً سابقاً");
    else if (values.dateOfBirth < shiftYears(today, -120)) errors.dateOfBirth = checkYear;
  }

  if (values.nationality && !countryCodes.has(values.nationality)) errors.nationality = pick(locale, "Choose a nationality", "اختر الجنسية");

  if (values.passportNumber && !/^[A-Z0-9]{5,20}$/.test(values.passportNumber)) {
    errors.passportNumber = pick(locale, "Use 5 to 20 letters or digits", "من 5 إلى 20 حرفاً أو رقماً");
  }

  if (values.passportExpiry) {
    if (!isRealDay(values.passportExpiry)) errors.passportExpiry = invalidDate;
    else if (values.passportExpiry <= today) errors.passportExpiry = pick(locale, "This passport has expired. Enter your current one", "هذا الجواز منتهٍ. أدخل بيانات جوازك الحالي");
    else if (values.passportExpiry > shiftYears(today, 20)) errors.passportExpiry = checkYear;
  }

  for (const field of profileFields) if (!errors[field]) delete errors[field];
  return errors;
}

export function sameProfile(a: ProfileValues, b: ProfileValues) {
  return profileFields.every((field) => a[field] === b[field]);
}

function dayStart(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

export function expiryHealth(expiry: string, today: string): PassportHealth {
  if (!isRealDay(expiry)) return "missing";
  return passportHealth(expiry, { now: dayStart(today) });
}

/** Checklist from the live form: invalid entries count as missing. */
export function completeness(values: ProfileValues, errors: ProfileErrors, documentKinds: string[]) {
  const valid = (field: ProfileField) => (errors[field] ? "" : values[field]);
  const base = profileChecklist({
    firstName: valid("firstName"),
    lastName: valid("lastName"),
    dateOfBirth: valid("dateOfBirth"),
    nationality: valid("nationality"),
    passportNumber: valid("passportNumber"),
    passportExpiry: valid("passportExpiry"),
    phone: valid("phone"),
    documentKinds,
  });
  const items = base.items.map((item) => (item.id === "expiry" ? { ...item, done: Boolean(valid("passportExpiry")) } : item));
  const done = items.filter((item) => item.done).length;
  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100) };
}

export type ChecklistItem = { id: ProfileItem; done: boolean };
