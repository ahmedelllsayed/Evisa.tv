import type { Destination } from "@/lib/types";

export type SearchHit = {
  slug: string;
  name: string;
  code: string;
  visaRequired: boolean;
  visaType: Destination["visaType"];
  processingHours: number | null;
  govFee: number;
  serviceFee: number;
  currency: string;
  image: string | null;
  flag: string | null;
  cities: string[];
};

export function toSearchHit(d: Destination): SearchHit {
  return {
    slug: d.slug,
    name: d.name,
    code: d.code,
    visaRequired: d.visaRequired,
    visaType: d.visaType,
    processingHours: d.processingHours,
    govFee: d.govFee,
    serviceFee: d.serviceFee,
    currency: d.currency,
    image: d.image,
    flag: d.flag,
    cities: d.cities,
  };
}

export function matchHits(hits: SearchHit[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return hits
    .map((h) => {
      const city = h.cities.find((c) => c.toLowerCase().includes(q));
      const nameHit = h.name.toLowerCase().includes(q) || h.code.toLowerCase().includes(q);
      if (!nameHit && !city) return null;
      return { hit: h, city: city ?? null, score: nameHit ? 0 : 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a!.score - b!.score || a!.hit.name.localeCompare(b!.hit.name))
    .map((x) => x!);
}
