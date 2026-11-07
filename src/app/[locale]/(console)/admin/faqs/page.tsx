import { FaqEditor } from "@/components/admin/faq-editor";
import { contentAccess } from "@/components/admin/content/access";
import { requireAdmin } from "@/lib/auth";
import { listAllFaqs, listDestinations } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "FAQs" };

export default async function AdminFaqsPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [faqs, destinations, access] = await Promise.all([listAllFaqs(), listDestinations({ includeInactive: true }), contentAccess(user.role)]);
  const names = Object.fromEntries(destinations.map((d) => [d.id, d.nameAr || d.name]));
  return <FaqEditor locale={locale} faqs={faqs} destinations={names} canEdit={access.canEdit} canDelete={access.canDelete} />;
}
