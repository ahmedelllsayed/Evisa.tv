import "server-only";
import { cookies } from "next/headers";
import { siteConfig } from "@/config/site.config";

export const CITIZENSHIP_COOKIE = "citizenship";

export async function getCitizenship() {
  const value = (await cookies()).get(CITIZENSHIP_COOKIE)?.value?.toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) ? value : siteConfig.market.countryCode;
}

export async function hasChosenCitizenship() {
  return Boolean((await cookies()).get(CITIZENSHIP_COOKIE)?.value);
}
