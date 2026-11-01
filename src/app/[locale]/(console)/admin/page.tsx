import Link from "next/link";
import { AdminAreaChart } from "@/components/admin/admin-charts";
import { AdminCard, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { applicationStats, applicationsByDay, queueCounts } from "@/lib/data/applications";
import { recentVisaOptionStats } from "@/lib/data/visa-options";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

export const metadata = { title: "لوحة التحكم" };

export default async function AdminHome({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [counts, stats, days, optionRows] = await Promise.all([queueCounts(user.id), applicationStats(), applicationsByDay(), recentVisaOptionStats()]);
  const revenue = stats.reduce((sum, row) => sum + row.revenue, 0);
  const cards = [
    { href: "/admin/queue?filter=mine", label: "طلباتي", value: String(counts.mine) },
    { href: "/admin/queue?filter=unassigned", label: "غير معيّن", value: String(counts.unassigned) },
    { href: "/admin/queue?filter=late", label: "متأخرة عن الموعد", value: String(counts.late) },
    { href: "/admin/queue?filter=documents", label: "مستندات تحتاج مراجعة", value: String(counts.documents) },
    { href: "/admin/queue?filter=paid_review", label: "مدفوع بانتظار المراجعة", value: String(counts.paidReview) },
    { href: "/admin/queue?filter=followup", label: "متابعة يدوية", value: String(counts.followup) },
    { href: "/admin/queue", label: "كل ما يحتاج إجراءً", value: "افتح الطابور" },
  ];
  return (
    <AdminPage title="نظرة عامة" description="ابدأ من الطلبات التي تحتاج إجراءً، ثم افتح الطلب نفسه.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={href(card.href, locale)}>
            <AdminCard className="h-full transition-colors hover:bg-accent">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
            </AdminCard>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <p className="text-sm font-medium">الإيرادات المسجّلة</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{revenue.toLocaleString("ar-EG")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {stats.map((row) => (
              <li key={row.status} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{row.status}</span>
                <span>{row.count}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
        <AdminCard>
          <p className="text-sm font-medium">آخر 30 يوماً</p>
          <div className="mt-4">
            <AdminAreaChart data={days} />
          </div>
        </AdminCard>
      </div>
      <AdminCard className="p-0">
        <div className="p-6 pb-0">
          <p className="text-sm font-medium">الطلبات حسب نوع التأشيرة · آخر 30 يوماً</p>
        </div>
        {optionRows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">لا توجد طلبات مرتبطة بنوع تأشيرة في هذه الفترة.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm">
            {optionRows.map((row) => (
              <li key={row.id}>
                <Link href={href(`/admin/applications?destination=${row.destinationSlug}&option=${row.id}`, locale)} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50">
                  <span>{row.destinationName} · {row.labelAr || row.label}</span>
                  <span className="text-muted-foreground">{row.total} · مدفوع {row.paid}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </AdminPage>
  );
}
