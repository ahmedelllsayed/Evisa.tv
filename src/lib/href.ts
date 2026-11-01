import { siteConfig } from "@/config/site.config";

/** Prefixes an app path with the locale segment. */
export function href(path: string, locale: string = siteConfig.defaultLocale) {
  if (/^https?:\/\//.test(path)) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

const localePrefix = /^\/[a-z]{2}-[A-Z]{2}(?=\/|$)/;

/** Rewrites the locale prefix and keeps the query string and hash. */
export function switchLocaleHref(path: string, search: string, hash: string, target: string) {
  const bare = path.replace(localePrefix, "") || "/";
  const next = `/${target}${bare === "/" ? "" : bare}`;
  const query = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  const anchor = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  return `${next}${query}${anchor}`;
}

export const visaHref = (slug: string, locale?: string) => href(`/visa/${slug}`, locale);
