import { ReviewEditor } from "@/components/admin/review-editor";
import { contentAccess } from "@/components/admin/content/access";
import { requireAdmin } from "@/lib/auth";
import { listAllReviews } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [reviews, access] = await Promise.all([listAllReviews(), contentAccess(user.role)]);
  return <ReviewEditor locale={locale} reviews={reviews} canEdit={access.canEdit} canDelete={access.canDelete} />;
}
