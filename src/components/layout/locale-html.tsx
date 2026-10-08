"use client";

import { useEffect } from "react";

/** The root layout is reused on client navigations, so keep html lang/dir in sync with the URL locale. */
export function LocaleHtml({ locale }: { locale: string }) {
  useEffect(() => {
    const arabic = locale.toLowerCase().startsWith("ar");
    document.documentElement.lang = arabic ? "ar" : "en";
    document.documentElement.dir = arabic ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
