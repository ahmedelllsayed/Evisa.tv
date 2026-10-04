import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";

export const metadata = { title: "Terms" };

export default async function TermsPage() {
  const content = await requirePageContent("terms");
  return <CmsProse title={content.title} intro={content.intro} body={content.body} />;
}
