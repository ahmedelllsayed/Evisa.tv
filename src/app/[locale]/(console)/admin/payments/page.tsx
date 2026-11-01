import Link from "next/link";
import { AdminCard, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { getInsights, insightDays } from "@/lib/data/insights";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

export const metadata = { title: "المدفوعات" };

export default async function PaymentsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  const days = insightDays(sp.days);
  const data = await getInsights(days);
  const total = data.payments.reduce((sum, row) => sum + row.total, 0);
  const cards = [
    { label: "مدفوع", value: String(data.paid) },
    { label: "قيد الانتظار", value: String(data.pending) },
    { label: "فشل", value: String(data.failed) },
    { label: "مسترد", value: String(data.refunded) },
    { label: "إجمالي المبالغ", value: total.toLocaleString("ar-EG") },
  ];
  return (
    <AdminPage
      title="المدفوعات"
      description="حالة عمليات الدفع خلال الفترة، مجمّعة من سجل المدفوعات."
      action={
        <div className="flex gap-2 text-sm">
          {[7, 30, 90].map((value) => (
            <Link key={value} href={href(`/admin/payments?days=${value}`, locale)} className={`rounded-md border px-3 py-1.5 ${days === value ? "bg-primary text-primary-foreground" : ""}`}>
              {value} يوم
            </Link>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <AdminCard key={card.label}>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </AdminCard>
        ))}
      </div>
      <AdminCard>
        <h2 className="text-sm font-medium">حسب وسيلة الدفع والحالة</h2>
        <ul className="mt-4 divide-y text-sm">
          {data.payments.length === 0 && <li className="py-3 text-muted-foreground">لا توجد عمليات في هذه الفترة.</li>}
          {data.payments.map((row) => (
            <li key={row.label} className="flex justify-between gap-3 py-2">
              <span>{row.label}</span>
              <span className="text-muted-foreground">{row.n} · {row.total.toLocaleString("ar-EG")}</span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </AdminPage>
  );
}
