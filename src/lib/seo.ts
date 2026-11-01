import type { Metadata } from "next";
import { isArabicLocale } from "@/lib/i18n";

export function localizedMetadata(locale: string, path: string, title: { en: string; ar: string }, description?: { en: string; ar: string }): Metadata {
  const arabic = isArabicLocale(locale);
  const enPath = `/en-EG${path}`;
  const arPath = `/ar-EG${path}`;
  return {
    title: arabic ? title.ar : title.en,
    description: description ? (arabic ? description.ar : description.en) : undefined,
    alternates: {
      canonical: arabic ? arPath : enPath,
      languages: {
        "en-EG": enPath,
        "ar-EG": arPath,
        "x-default": enPath,
      },
    },
  };
}
