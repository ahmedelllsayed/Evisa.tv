import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/editorial-policy", { en: "Editorial Policy", ar: "سياسة التحرير" });
}

export default async function EditorialPolicyPage({ params }: Page) {
  await params;
  const content = await requirePageContent("editorial-policy");
  return <CmsProse title={content.title} intro={content.intro} body={content.body} />;
}
