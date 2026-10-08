import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = siteConfig.locales.flatMap((locale) => [
    `/${locale}/admin`,
    `/${locale}/sign-in`,
    `/${locale}/payment`,
    `/${locale}/apply`,
    `/${locale}/account`,
  ]);
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
