"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";

export function LocaleSwitch({ locale }: { locale: string }) {
  const path = usePathname() || `/${locale}`;
  const next = locale.toLowerCase().startsWith("ar") ? "en-EG" : "ar-EG";
  const target = path.replace(/^\/[a-z]{2}-[A-Z]{2}/, `/${next}`) || `/${next}`;
  return (
    <Link href={target} className="text-sm font-medium text-brand" hrefLang={next.startsWith("ar") ? "ar" : "en"}>
      {t(locale, "nav.language")}
    </Link>
  );
}
