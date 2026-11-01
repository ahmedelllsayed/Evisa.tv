"use client";

import { useEffect } from "react";

/** The root layout is reused on client navigations, so language and direction are set here too. */
export function LocaleHtml({ locale }: { locale: string }) {
  useEffect(() => {
    const arabic = locale.toLowerCase().startsWith("ar");
    document.documentElement.lang = arabic ? "ar" : "en";
    document.documentElement.dir = arabic ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
