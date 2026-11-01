import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/terms", { en: "Terms", ar: "الشروط" });
}

export default async function TermsPage() {
  const content = await requirePageContent("terms");
  return <CmsProse title={content.title} intro={content.intro} body={content.body} />;
}
