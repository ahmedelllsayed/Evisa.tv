import { PassportBoard } from "@/components/tools/passport-board";
import { requirePageContent } from "@/lib/data/pages";
import type { Page } from "@/lib/page";

export const metadata = { title: "Passport Index" };

export default async function PassportIndexPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("passport-index");
  return <PassportBoard locale={locale} kicker={content.kicker} title={content.title} intro={content.intro} />;
}
