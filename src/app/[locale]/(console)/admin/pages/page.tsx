import { PageEditor } from "@/components/admin/page-editor";
import { requireAdmin } from "@/lib/auth";
import { listPages } from "@/lib/data/pages";
import type { Page } from "@/lib/page";

export const metadata = { title: "الصفحات" };

export default async function AdminPagesPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const pages = await listPages();
  return <PageEditor locale={locale} pages={pages} />;
}
