import Link from "next/link";
import { emailReport } from "@/app/actions/reports";
import { AdminCard, AdminPage, adminPrimaryClass } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { getInsights, insightDays, insightSheets } from "@/lib/data/insights";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "التقارير" };

export default async function ReportsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  if (!(await currentUserHasPermission("reports", "view"))) redirect(`/${locale}/admin`);
  const days = insightDays(sp.days);
  const data = await getInsights(days);
  const sheets = insightSheets(data);
  const query = `days=${days}`;
  return (
    <AdminPage
      title="التقارير"
      description="تُبنى الأرقام من الطلبات والمدفوعات والموظفين. ملف Excel يفتح بالعربية، وصفحة الطباعة تُحفظ PDF من المتصفح."
      action={
        <div className="flex flex-wrap gap-2 text-sm">
          {[7, 30, 90].map((value) => (
            <Link key={value} href={href(`/admin/reports?days=${value}`, locale)} className={`rounded-md border px-3 py-1.5 ${days === value ? "bg-primary text-primary-foreground" : ""}`}>
              {value} يوم
            </Link>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 text-sm print:hidden">
        <a className={adminPrimaryClass} href={`/api/admin/reports/all?${query}&format=xlsx`}>تنزيل Excel</a>
        <a className="inline-flex h-9 items-center rounded-md border px-4" href={`/api/admin/reports/revenue?${query}&format=csv`}>إيراد CSV</a>
        <a className="inline-flex h-9 items-center rounded-md border px-4" href={`/api/admin/reports/operations?${query}&format=xlsx`}>تشغيل</a>
        <a className="inline-flex h-9 items-center rounded-md border px-4" href={`/api/admin/reports/staff?${query}&format=xlsx`}>موظفون</a>
        <a className="inline-flex h-9 items-center rounded-md border px-4" href={`/api/admin/reports/quality?${query}&format=xlsx`}>جودة</a>
        <form action={emailReport.bind(null, locale, days)}>
          <button className="inline-flex h-9 items-center rounded-md border px-4">إرسال التقرير لبريدي</button>
        </form>
        <p className="self-center text-muted-foreground">لحفظ PDF استخدم طباعة المتصفح على هذه الصفحة.</p>
      </div>
      {sheets.map((sheet) => (
        <AdminCard key={sheet.name}>
          <h2 className="text-sm font-medium">{sheet.name}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {sheet.rows.map((row, index) => (
                  <tr key={`${sheet.name}-${index}`} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-1.5">{String(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      ))}
    </AdminPage>
  );
}
