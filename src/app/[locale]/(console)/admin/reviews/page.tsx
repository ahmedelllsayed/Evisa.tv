import { ReviewEditor } from "@/components/admin/review-editor";
import { requireAdmin } from "@/lib/auth";
import { listAllReviews } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const reviews = await listAllReviews();
  return <ReviewEditor locale={locale} reviews={reviews} />;
}
