import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";
import { listDestinations } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

const paths = [
  "",
  "/on-time-guaranteed",
  "/rejection-recovery",
  "/wall-of-love",
  "/passport-index",
  "/tools/visa-requirements",
  "/tools/visa-photo-maker",
  "/transparency/refunds-policy",
  "/transparency/price-change-log",
  "/transparency/status",
  "/contact",
  "/partners",
  "/newsroom",
  "/privacy",
  "/terms",
  "/emergency-care",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locale = siteConfig.defaultLocale;
  const staticEntries = paths.map((p) => ({
    url: `${siteConfig.url}/${locale}${p}`,
    lastModified: new Date(),
  }));
  try {
    const destinations = await listDestinations();
    const visas = destinations.map((destination) => ({
      url: `${siteConfig.url}/${locale}/visa/${destination.slug}`,
      lastModified: new Date(destination.updatedAt),
    }));
    return [...staticEntries, ...visas];
  } catch {
    return staticEntries;
  }
}
