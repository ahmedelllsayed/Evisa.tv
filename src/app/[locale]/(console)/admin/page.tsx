import Link from "next/link";
import { AdminCard, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { queueCounts } from "@/lib/data/applications";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

export const metadata = { title: "لوحة التحكم" };

export default async function AdminHome({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const counts = await queueCounts(user.id);
  const cards = [
    { href: "/admin/queue?filter=mine", label: "طلباتي", value: String(counts.mine) },
    { href: "/admin/queue?filter=unassigned", label: "غير معيّن", value: String(counts.unassigned) },
    { href: "/admin/queue?filter=late", label: "متأخرة عن الموعد", value: String(counts.late) },
    { href: "/admin/queue?filter=documents", label: "مستندات تحتاج مراجعة", value: String(counts.documents) },
    { href: "/admin/queue?filter=paid_review", label: "مدفوع بانتظار المراجعة", value: String(counts.paidReview) },
    { href: "/admin/queue", label: "كل ما يحتاج إجراءً", value: "افتح الطابور" },
  ];
  return (
    <AdminPage title="نظرة عامة" description="ابدأ من الطلبات التي تحتاج إجراءً، ثم افتح الطلب نفسه.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={href(card.href, locale)}>
            <AdminCard className="h-full transition-colors hover:border-brand">
              <p className="text-sm text-muted-ink">{card.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold">{card.value}</p>
            </AdminCard>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
