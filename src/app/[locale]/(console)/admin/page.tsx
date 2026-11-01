import Link from "next/link";
import { AdminAreaChart, AdminBarChart, AdminHoursChart, AdminRevenueChart } from "@/components/admin/admin-charts";
import { AdminCard, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { queueCounts } from "@/lib/data/applications";
import { getInsights, insightDays } from "@/lib/data/insights";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

export const metadata = { title: "لوحة التحكم" };

export default async function AdminHome({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await requireAdmin(locale);
  const days = insightDays(sp.days);
  const [counts, insights] = await Promise.all([queueCounts(user.id), getInsights(days)]);
  const decided = insights.approved + insights.rejected;
  const approval = decided === 0 ? 0 : Math.round((insights.approved / decided) * 100);
  const refundBase = insights.paid + insights.refunded;
  const refundRate = refundBase === 0 ? 0 : Math.round((insights.refunded / refundBase) * 100);
  const change = insights.revenuePrevious === 0 ? null : Math.round(((insights.revenueNow - insights.revenuePrevious) / insights.revenuePrevious) * 100);
  const cards = [
    { href: "/admin/reports?days=" + days, label: `إيراد ${days} يوماً`, value: insights.revenueNow.toLocaleString("ar-EG"), note: change === null ? "لا توجد فترة سابقة" : `${change > 0 ? "↑" : "↓"} ${Math.abs(change)}% عن الفترة السابقة` },
    { href: "/admin/applications", label: "طلبات الفترة", value: String(insights.applications), note: `قبول ${approval}%` },
    { href: "/admin/queue?filter=late", label: "متأخرة الآن", value: String(counts.late), note: `متوسط المعالجة ${insights.avgHours.toFixed(1)} س` },
    { href: "/admin/payments", label: "نسبة الاسترداد", value: `${refundRate}%`, note: `${insights.paid} مدفوع · ${insights.failed} فشل` },
    { href: "/admin/queue?filter=mine", label: "طلباتي", value: String(counts.mine), note: `${counts.unassigned} غير معيّن` },
    { href: "/admin/reviews", label: "تقييم الموقع", value: insights.reviewRating.toFixed(1), note: `${insights.reviewCount} تقييم في الفترة` },
  ];
  return (
    <AdminPage
      title="نظرة عامة"
      description="إيرادات التشغيل والتحويل وأداء الفريق خلال الفترة المختارة."
      action={
        <div className="flex gap-2 text-sm">
          {[7, 30, 90].map((value) => (
            <Link key={value} href={href(`/admin?days=${value}`, locale)} className={`rounded-md border px-3 py-1.5 ${days === value ? "bg-primary text-primary-foreground" : ""}`}>
              {value} يوم
            </Link>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={href(card.href, locale)}>
            <AdminCard className="h-full">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{card.note}</p>
            </AdminCard>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <p className="text-sm font-medium">الإيراد اليومي</p>
          <div className="mt-4">{insights.revenueDays.length ? <AdminRevenueChart data={insights.revenueDays} /> : <p className="text-sm text-muted-foreground">لا توجد مدفوعات في هذه الفترة.</p>}</div>
        </AdminCard>
        <AdminCard>
          <p className="text-sm font-medium">الطلبات اليومية</p>
          <div className="mt-4">{insights.applicationDays.length ? <AdminAreaChart data={insights.applicationDays} /> : <p className="text-sm text-muted-foreground">لا توجد طلبات في هذه الفترة.</p>}</div>
        </AdminCard>
        <AdminCard>
          <p className="text-sm font-medium">مسار التحويل</p>
          <div className="mt-4">{insights.funnel.length ? <AdminBarChart data={insights.funnel} /> : <p className="text-sm text-muted-foreground">لم تُسجَّل خطوات تحويل بعد.</p>}</div>
        </AdminCard>
        <AdminCard>
          <p className="text-sm font-medium">متوسط وقت المعالجة بالساعات</p>
          <div className="mt-4">{insights.processingDays.length ? <AdminHoursChart data={insights.processingDays} /> : <p className="text-sm text-muted-foreground">لا توجد طلبات مغلقة في هذه الفترة.</p>}</div>
        </AdminCard>
        <AdminCard>
          <p className="text-sm font-medium">جنسيات المسافرين</p>
          <div className="mt-4">{insights.geography.length ? <AdminBarChart data={insights.geography} /> : <p className="text-sm text-muted-foreground">لا توجد جنسيات مسجّلة.</p>}</div>
        </AdminCard>
        <AdminCard>
          <p className="text-sm font-medium">أكثر الوجهات</p>
          <ul className="mt-4 space-y-2 text-sm">
            {insights.destinations.length === 0 && <li className="text-muted-foreground">لا توجد طلبات.</li>}
            {insights.destinations.map((row) => (
              <li key={row.label} className="flex justify-between gap-3">
                <span>{row.label}</span>
                <span className="text-muted-foreground">{row.n} · {row.revenue.toLocaleString("ar-EG")}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
      <AdminCard>
        <p className="text-sm font-medium">أداء الموظفين</p>
        <ul className="mt-4 divide-y text-sm">
          {insights.staff.length === 0 && <li className="py-3 text-muted-foreground">لا يوجد موظفون بعد.</li>}
          {insights.staff.map((row) => (
            <li key={row.label} className="flex justify-between gap-3 py-2">
              <span>{row.label}</span>
              <span className="text-muted-foreground">{row.processed} معالج · {row.approved} مقبول · {row.hours} س</span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </AdminPage>
  );
}
