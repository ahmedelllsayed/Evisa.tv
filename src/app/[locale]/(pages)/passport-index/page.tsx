import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { PassportBoard } from "@/components/tools/passport-board";
import { countries, countryName } from "@/lib/countries";
import { passportRanks } from "@/data/passport-ranks";
import { requirePageContent } from "@/lib/data/pages";

const rankCodes: Record<string, string> = {
  "South Korea": "KR",
  Czechia: "CZ",
  "United Arab Emirates": "AE",
  "United States": "US",
  "United Kingdom": "GB",
};


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/passport-index", { en: "Passport Index", ar: "مؤشر الجوازات" });
}

export default async function PassportIndexPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("passport-index");
  const byEnglish = new Map(countries.map((country) => [country.name, country.code]));
  const names = Object.fromEntries(
    passportRanks.map((rank) => {
      const code = rankCodes[rank.name] ?? byEnglish.get(rank.name);
      return [rank.name, code ? countryName(code, locale) : rank.name];
    }),
  );
  return <PassportBoard locale={locale} names={names} kicker={content.kicker} title={content.title} intro={content.intro} />;
}
