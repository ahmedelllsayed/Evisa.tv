import { headers } from "next/headers";
import { isLocale, siteConfig, type Locale } from "@/config/site.config";

export async function currentLocale(): Promise<Locale> {
  const value = (await headers()).get("x-locale") ?? "";
  return isLocale(value) ? value : siteConfig.defaultLocale;
}
