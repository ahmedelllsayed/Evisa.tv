import { countries, countryName } from "@/lib/countries";
import { visaHref } from "@/lib/href";
import { isArabicLocale } from "@/lib/i18n";
import { localizeReview, localizedDestinationName } from "@/lib/localize";
import type { Destination, Review } from "@/lib/types";
import { formatDate, initials } from "@/lib/visa";

export type WallReview = {
  id: string;
  author: string;
  initials: string;
  location: string | null;
  title: string | null;
  body: string;
  rating: number;
  sample: boolean;
  verified: boolean;
  /** Language the review was written in, read from the primary text. */
  lang: "ar" | "en";
  visaKey: string | null;
  visaLabel: string | null;
  visaHref: string | null;
  source: { label: string; url: string | null } | null;
  date: string | null;
  publishedAt: string;
  order: number;
};

export type WallStats = {
  count: number;
  average: string;
  verified: number;
  distribution: { stars: number; count: number }[];
  latest: string | null;
};

const ARABIC = /[\u0600-\u06FF]/;

const ALIASES: Record<string, string> = {
  uae: "AE",
  emirates: "AE",
  dubai: "AE",
  uk: "GB",
  britain: "GB",
  england: "GB",
  usa: "US",
  us: "US",
  america: "US",
  turkey: "TR",
  turkiye: "TR",
};

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(e-?visa|visa|tourist|evisa)\b|تأشيرة|فيزا/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function matchVisa(review: Review, destinations: Destination[], locale: string) {
  const ar = isArabicLocale(locale);
  const byId = review.destinationId ? destinations.find((d) => d.id === review.destinationId) : undefined;
  const key = review.product ? normalize(review.product) : "";
  const dest =
    byId ??
    (key
      ? destinations.find((d) =>
          [d.name, d.nameAr ?? "", d.slug.replace(/-visa$/, ""), d.code].some((name) => name && normalize(name) === key),
        ) ?? destinations.find((d) => d.code === ALIASES[key])
      : undefined);
  if (dest) {
    const name = localizedDestinationName(dest, locale);
    return { key: dest.slug, label: ar ? `تأشيرة ${name}` : `${name} Visa`, href: visaHref(dest.slug, locale) };
  }
  if (!review.product) return null;
  if (ar && key === "schengen") return { key, label: "تأشيرة شنغن", href: null };
  const code = ALIASES[key] ?? countries.find((country) => normalize(country.name) === key)?.code;
  if (ar && code) return { key, label: `تأشيرة ${countryName(code, locale)}`, href: null };
  return { key: key || review.product, label: review.product, href: null };
}

/** Public platforms and links are shown; anything else (such as an order number) stays internal. */
function publicSource(review: Review) {
  const url = review.url?.trim() || (/^https?:\/\//.test(review.source ?? "") ? review.source!.trim() : null);
  const text = review.source?.trim() ?? "";
  if (url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return { label: text && !/^https?:\/\//.test(text) && !/\d/.test(text) ? text : host, url };
    } catch {
      return null;
    }
  }
  if (!text || /\d/.test(text) || text.length > 40) return null;
  return { label: text, url: null };
}

export function buildWall(reviews: Review[], destinations: Destination[], locale: string) {
  const items: WallReview[] = reviews.map((raw, order) => {
    const review = localizeReview(raw, locale);
    const visa = matchVisa(raw, destinations, locale);
    return {
      id: review.id,
      author: review.author,
      initials: initials(review.author),
      location: review.location,
      title: review.title,
      body: review.body,
      rating: Math.max(0, Math.min(5, Math.round(review.rating))),
      sample: Boolean(review.isSample),
      verified: Boolean(review.verified) && !review.isSample,
      lang: ARABIC.test(raw.body) ? "ar" : "en",
      visaKey: visa?.key ?? null,
      visaLabel: visa?.label ?? null,
      visaHref: visa?.href ?? null,
      source: review.isSample ? null : publicSource(raw),
      date: review.publishedAt ? formatDate(`${review.publishedAt}T12:00:00Z`, locale) : null,
      publishedAt: review.publishedAt,
      order,
    };
  });
  const real = items.filter((item) => !item.sample);
  const latest = real.reduce<string>((max, item) => (item.publishedAt > max ? item.publishedAt : max), "");
  const stats: WallStats | null = real.length
    ? {
        count: real.length,
        average: (real.reduce((sum, item) => sum + item.rating, 0) / real.length).toFixed(1),
        verified: real.filter((item) => item.verified).length,
        distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: real.filter((item) => item.rating === stars).length })),
        latest: latest ? formatDate(`${latest}T12:00:00Z`, locale) : null,
      }
    : null;
  return { items, stats };
}
