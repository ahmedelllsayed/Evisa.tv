import { isArabicLocale } from "@/lib/i18n";
import { countryName } from "@/lib/countries";
import { documentLabels } from "@/data/seed/content";
import type { Faq, Review } from "@/lib/types";

const phrases: Record<string, string> = {
  Single: "مرة واحدة",
  Multiple: "متعدد",
  Paperless: "بدون ورق",
  "All Ports of Entry": "كل منافذ الدخول",
};

export function localizedPhrase(text: string | null | undefined, locale: string, override?: string | null) {
  if (override && isArabicLocale(locale)) return override;
  if (!text) return "";
  if (!isArabicLocale(locale)) return text;
  if (phrases[text]) return phrases[text];
  const days = /^(\d+)\s+days?$/i.exec(text);
  if (days) return Number(days[1]) === 1 ? "يوم" : `${days[1]} يوماً`;
  const months = /^(\d+)\s+months?$/i.exec(text);
  if (months) return Number(months[1]) === 1 ? "شهر" : `${months[1]} أشهر`;
  return text;
}

export function localizedDestinationName(d: { name: string; nameAr?: string | null; code?: string | null }, locale: string) {
  if (!isArabicLocale(locale)) return d.name;
  if (d.nameAr) return d.nameAr;
  return countryName(d.code, locale) || d.name;
}

const categoryAr: Record<string, string> = {
  "General Information": "معلومات عامة",
  "Eligibility & Requirements": "الأهلية والمتطلبات",
  "Application Process": "إجراءات الطلب",
  "Status Tracking": "متابعة الحالة",
  "Refunds, Rejections & Reapplications": "الاسترداد والرفض وإعادة التقديم",
  "Visa Extension & Overstays": "التمديد وتجاوز الإقامة",
  General: "عام",
  Refunds: "الاسترداد",
  Emergency: "الطوارئ",
};

export function categoryLabel(category: string, locale: string, override?: string | null) {
  if (!isArabicLocale(locale)) return category;
  if (override) return override;
  return categoryAr[category] ?? category;
}

export function docLabel(kind: string, locale: string) {
  const row = documentLabels[kind];
  if (!row) return kind;
  return isArabicLocale(locale) ? row.labelAr : row.label;
}

export function docHint(kind: string, locale: string) {
  const row = documentLabels[kind];
  if (!row) return "";
  return isArabicLocale(locale) ? row.hintAr : row.hint;
}

export function localizeFaq<T extends Pick<Faq, "question" | "answer" | "category"> & { questionAr?: string | null; answerAr?: string | null; categoryAr?: string | null }>(
  faq: T,
  locale: string,
): T {
  if (!isArabicLocale(locale)) return faq;
  return {
    ...faq,
    question: faq.questionAr || faq.question,
    answer: faq.answerAr || faq.answer,
    category: faq.categoryAr || faq.category,
  };
}

export function localizeReview<T extends Pick<Review, "title" | "body"> & { titleAr?: string | null; bodyAr?: string | null }>(review: T, locale: string): T {
  if (!isArabicLocale(locale)) return review;
  return { ...review, title: review.titleAr || review.title, body: review.bodyAr || review.body };
}
