import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";

const locale = siteConfig.defaultLocale;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        `/${locale}/admin`,
        `/${locale}/sign-in`,
        `/${locale}/payment`,
        `/${locale}/apply`,
        `/${locale}/account`,
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
