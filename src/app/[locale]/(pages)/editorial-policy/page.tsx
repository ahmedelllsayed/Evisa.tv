import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";
import type { Page } from "@/lib/page";

export const metadata = { title: "Editorial Policy" };

export default async function EditorialPolicyPage({ params }: Page) {
  await params;
  const content = await requirePageContent("editorial-policy");
  return <CmsProse title={content.title} intro={content.intro} body={content.body} />;
}
