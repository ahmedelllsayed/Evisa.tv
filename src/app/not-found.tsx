import Link from "next/link";
import { cookies } from "next/headers";
import { isLocale, siteConfig } from "@/config/site.config";
import { t } from "@/lib/i18n";

export default async function NotFound() {
  const cookie = (await cookies()).get("locale")?.value ?? "";
  const locale = isLocale(cookie) ? cookie : siteConfig.defaultLocale;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-ink">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">{t(locale, "page.notFound")}</h1>
      <Link href={`/${locale}`} className="mt-6 rounded-full bg-brand px-5 py-2 text-sm text-white">
        {t(locale, "page.home")}
      </Link>
    </div>
  );
}
