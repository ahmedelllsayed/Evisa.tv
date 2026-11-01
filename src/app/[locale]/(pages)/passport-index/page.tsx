import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { PassportBoard } from "@/components/tools/passport-board";
import { requirePageContent } from "@/lib/data/pages";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/passport-index", { en: "Passport Index", ar: "مؤشر الجوازات" });
}

export default async function PassportIndexPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("passport-index");
  return <PassportBoard locale={locale} kicker={content.kicker} title={content.title} intro={content.intro} />;
}
