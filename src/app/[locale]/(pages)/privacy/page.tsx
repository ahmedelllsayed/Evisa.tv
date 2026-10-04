import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";

export const metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const content = await requirePageContent("privacy");
  return <CmsProse title={content.title} intro={content.intro} body={content.body} />;
}
