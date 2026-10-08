import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";
import { listDestinations } from "@/lib/data/catalog";
import { emptyContentSlugs, unpublishedSlugs } from "@/lib/data/pages";

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
  "/editorial-policy",
  "/emergency-care",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = siteConfig.locales;
  const [unpublished, empty] = await Promise.all([unpublishedSlugs(), emptyContentSlugs()]);
  const hidden = new Set([...unpublished, ...empty]);
  const visiblePaths = paths.filter((path) => !hidden.has(path.replace(/^\//, "")));
  const staticEntries = locales.flatMap((locale) =>
    visiblePaths.map((path) => ({
      url: `${siteConfig.url}/${locale}${path}`,
      lastModified: new Date(),
    })),
  );
  try {
    const destinations = await listDestinations();
    const visas = locales.flatMap((locale) =>
      destinations.map((destination) => ({
        url: `${siteConfig.url}/${locale}/visa/${destination.slug}`,
        lastModified: new Date(destination.updatedAt),
      })),
    );
    return [...staticEntries, ...visas];
  } catch {
    return staticEntries;
  }
}
