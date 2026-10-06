"use client";

import { createContext, useContext } from "react";
import { ThemeProvider } from "next-themes";
import { siteConfig } from "@/config/site.config";
import { t, tf, type MessageKey } from "@/lib/i18n";

const LocaleContext = createContext<string>(siteConfig.defaultLocale);

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return {
    locale,
    t: (key: MessageKey) => t(locale, key),
    tf: (key: MessageKey, vars: Record<string, string | number>) => tf(locale, key, vars),
  };
}

export function Providers({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <LocaleContext.Provider value={locale}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
        {children}
      </ThemeProvider>
    </LocaleContext.Provider>
  );
}
