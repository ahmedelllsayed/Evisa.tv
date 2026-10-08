"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { switchLocaleHref } from "@/lib/href";
import { t } from "@/lib/i18n";

export function rememberLocale(locale: string) {
  document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  track("language_switch", { language: locale });
}

export function useLocaleHref(target: string) {
  const path = usePathname() || "/";
  const [extra, setExtra] = useState("");
  useEffect(() => {
    setExtra(`${window.location.search}${window.location.hash}`);
  }, [path]);
  return `${switchLocaleHref(path, "", "", target)}${extra}`;
}

export function LocaleSwitch({ locale }: { locale: string }) {
  const next = locale.toLowerCase().startsWith("ar") ? "en-EG" : "ar-EG";
  const target = useLocaleHref(next);
  return (
    <Link
      href={target}
      onClick={() => rememberLocale(next)}
      className="text-sm font-medium text-brand"
      hrefLang={next.startsWith("ar") ? "ar" : "en"}
    >
      {t(locale, "nav.language")}
    </Link>
  );
}
