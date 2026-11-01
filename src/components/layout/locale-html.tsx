"use client";

import { useEffect } from "react";

/** The root layout is reused on client navigations. Arabic changes the language only; the page stays left to right. */
export function LocaleHtml({ locale }: { locale: string }) {
  useEffect(() => {
    const arabic = locale.toLowerCase().startsWith("ar");
    document.documentElement.lang = arabic ? "ar" : "en";
    document.documentElement.dir = "ltr";
  }, [locale]);
  return null;
}
