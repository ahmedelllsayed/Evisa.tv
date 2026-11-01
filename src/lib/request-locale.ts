import "server-only";
import { cookies, headers } from "next/headers";
import { isLocale, siteConfig } from "@/config/site.config";

export async function requestLocale() {
  const header = (await headers()).get("x-locale");
  if (header && isLocale(header)) return header;
  const cookie = (await cookies()).get("locale")?.value;
  if (cookie && isLocale(cookie)) return cookie;
  return siteConfig.defaultLocale;
}
