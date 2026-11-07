import { PageEditor } from "@/components/admin/page-editor";
import { contentAccess } from "@/components/admin/content/access";
import { requireAdmin } from "@/lib/auth";
import { listPages } from "@/lib/data/pages";
import type { Page } from "@/lib/page";

export const metadata = { title: "الصفحات" };

export default async function AdminPagesPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [pages, access] = await Promise.all([listPages(), contentAccess(user.role)]);
  return <PageEditor locale={locale} pages={pages} canEdit={access.canEdit} canDelete={access.canDelete} canPublish={access.canPublish} />;
}
