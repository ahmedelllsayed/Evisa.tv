import { siteConfig } from "@/config/site.config";

/** Prefixes an app path with the locale segment. */
export function href(path: string, locale: string = siteConfig.defaultLocale) {
  if (/^https?:\/\//.test(path)) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

export const visaHref = (slug: string, locale?: string) => href(`/visa/${slug}`, locale);
