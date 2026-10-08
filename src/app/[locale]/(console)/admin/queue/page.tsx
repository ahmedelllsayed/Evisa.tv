import Link from "next/link";
import { ApplicationTable } from "@/components/admin/application-table";
import { AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { listAllApplications, opsCounts, queueCounts, type QueueFilter } from "@/lib/data/applications";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { cn } from "@/lib/utils";

const filters: { id: Exclude<QueueFilter, "attention"> | "all"; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "mine", label: "طلباتي" },
  { id: "unassigned", label: "غير معيّن" },
  { id: "late", label: "متأخر عن الموعد" },
  { id: "documents", label: "مستندات" },
  { id: "paid_review", label: "مدفوع بانتظار المراجعة" },
];

export const metadata = { title: "الطابور" };

export default async function AdminQueuePage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await requireAdmin(locale);
  const requested = typeof sp.filter === "string" ? sp.filter : "all";
  const filter = filters.some((item) => item.id === requested) ? (requested as (typeof filters)[number]["id"]) : "all";
  const [apps, counts, ops] = await Promise.all([
    listAllApplications({ queue: filter === "all" ? "attention" : filter, assigneeId: user.id, limit: 100 }),
    queueCounts(user.id),
    opsCounts(),
  ]);
  const countFor = (id: (typeof filters)[number]["id"]) => {
    if (id === "all") return ops.attention;
    if (id === "paid_review") return counts.paidReview;
    return counts[id];
  };
  return (
    <AdminPage title="الطابور" description="الطلبات التي تحتاج إجراءً الآن. اختر صفًا لفتح الطلب.">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-2 text-sm">
        {filters.map((item) => {
          const count = countFor(item.id);
          return (
            <Link
              key={item.id}
              href={href(item.id === "all" ? "/admin/queue" : `/admin/queue?filter=${item.id}`, locale)}
              className={cn("rounded-full px-3 py-1", filter === item.id ? "bg-brand text-white" : "bg-white text-ink")}
            >
              {item.label}
              {` · ${count}`}
            </Link>
          );
        })}
      </div>
      <div className="mt-4">
        <ApplicationTable locale={locale} applications={apps} />
      </div>
    </AdminPage>
  );
}
