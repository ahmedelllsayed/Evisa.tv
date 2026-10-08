import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/privacy", { en: "Privacy", ar: "الخصوصية" });
}

export default async function PrivacyPage() {
  const content = await requirePageContent("privacy");
  return <CmsProse title={content.title} intro={content.intro} body={content.body} />;
}
