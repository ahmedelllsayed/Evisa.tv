import { CitizenshipEditor } from "@/components/admin/citizenship-editor";
import { contentAccess } from "@/components/admin/content/access";
import { byText } from "@/components/admin/content/text";
import { requireAdmin } from "@/lib/auth";
import { countries, countryName } from "@/lib/countries";
import { getCitizenshipCodes } from "@/lib/data/settings";
import type { Page } from "@/lib/page";

export const metadata = { title: "الجنسيات" };

export default async function AdminCitizenshipsPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [selected, access] = await Promise.all([getCitizenshipCodes(), contentAccess(user.role, "settings")]);
  const list = countries
    .map((country) => ({ code: country.code, name: country.name, nameAr: countryName(country.code, "ar") }))
    .sort((a, b) => byText(a.name, b.name) || byText(a.code, b.code));
  return <CitizenshipEditor locale={locale} countries={list} selected={selected} canEdit={access.canEdit} />;
}
