import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/account/profile-form";
import { marketToday } from "@/components/account/profile/rules";
import { siteConfig } from "@/config/site.config";
import { requireUser } from "@/lib/auth";
import { countries, countryName } from "@/lib/countries";
import { getProfileVault } from "@/lib/data/profile-vault";
import { isArabicLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/account/profile", { en: "Profile", ar: "الملف الشخصي" });
}

/** Sorted here so the browser renders exactly the server's order; ICU collation differs between Node and browsers. */
function nationalityOptions(locale: string) {
  const collator = new Intl.Collator(isArabicLocale(locale) ? "ar" : "en");
  const home = siteConfig.market.countryCode;
  const list = countries.map((country) => ({ code: country.code, name: countryName(country.code, locale) })).sort((a, b) => collator.compare(a.name, b.name));
  return [...list.filter((country) => country.code === home), ...list.filter((country) => country.code !== home)];
}

export default async function ProfilePage({ params }: Page) {
  const { locale } = await params;
  const user = await requireUser(locale, `/${locale}/account/profile`);
  const vault = await getProfileVault(user.id);
  if (!vault) notFound();
  return <ProfileForm locale={locale} email={user.email} vault={vault} today={marketToday()} nationalities={nationalityOptions(locale)} />;
}
