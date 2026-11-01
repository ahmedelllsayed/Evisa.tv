import { FaqEditor } from "@/components/admin/faq-editor";
import { requireAdmin } from "@/lib/auth";
import { listAllFaqs } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "FAQs" };

export default async function AdminFaqsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const faqs = await listAllFaqs();
  return <FaqEditor locale={locale} faqs={faqs} />;
}
