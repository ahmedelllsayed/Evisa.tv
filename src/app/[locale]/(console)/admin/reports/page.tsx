import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { emailReport } from "@/app/actions/reports";
import { AdminEmpty, AdminNotice, AdminPage, AdminPanel, Bar, PeriodSwitch, adminGhostClass, adminPrimaryClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { count, egp } from "@/components/admin/format";
import { change, pct } from "@/components/admin/insights/math";
import { PrintButton } from "@/components/admin/insights/print-button";
import { requireAdmin } from "@/lib/auth";
import { getInsights, insightDays } from "@/lib/data/insights";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export const metadata = { title: "التقارير" };

const sections = [
  { id: "revenue", index: "01", title: "الإيرادات", hint: "المبالغ المدفوعة يوماً بيوم." },
  { id: "operations", index: "02", title: "التشغيل", hint: "الطلبات الجديدة والقرارات والالتزام بالموعد." },
  { id: "staff", index: "03", title: "الموظفون", hint: "الملفات المغلقة لكل موظف." },
  { id: "quality", index: "04", title: "الجودة", hint: "القبول والمدفوعات وأسباب رفض المستندات." },
] as const;

const linkClass = "inline-flex h-8 items-center rounded-md border border-input px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground";

export default async function ReportsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  if (!(await currentUserHasPermission("reports", "view"))) redirect(`/${locale}/admin`);
  const days = insightDays(sp.days);
  const data = await getInsights(days);
  const query = `days=${days}`;
  const file = (kind: string, format: "xlsx" | "csv") => `/api/admin/reports/${kind}?${query}&format=${format}`;

  const decided = data.approved + data.rejected;
  const approval = pct(data.approved, decided);
  const onTimeRate = pct(data.onTime, data.onTime + data.late);
  const revenueChange = change(data.revenueNow, data.revenuePrevious);
  const paidOps = data.revenueDays.reduce((sum, row) => sum + row.n, 0);
  const revenueRows = [...data.revenueDays].reverse();
  const maxRevenue = Math.max(...data.revenueDays.map((row) => row.revenue), 0);
  const applicationRows = [...data.applicationDays].reverse();
  const maxApplications = Math.max(...data.applicationDays.map((row) => row.n), 0);
  const maxProcessed = Math.max(...data.staff.map((row) => row.processed), 0);
  const rejections = data.documentRejections.reduce((sum, row) => sum + row.n, 0);
  const rowsIn: Record<(typeof sections)[number]["id"], number> = {
    revenue: data.revenueDays.length,
    operations: data.applicationDays.length,
    staff: data.staff.length,
    quality: data.documentRejections.length,
  };

  return (
    <AdminPage
      eyebrow="REPORTS"
      title="التقارير"
      description="أرقام الطلبات والمدفوعات والموظفين للفترة المختارة. ملفات Excel تفتح بالعربية، والطباعة تُحفظ PDF من المتصفح."
      action={<PeriodSwitch base={href("/admin/reports", locale)} days={days} />}
    >
      {sp.sent === "1" ? (
        <AdminNotice tone="success">
          <p>أُرسل التقرير إلى بريدك كملف CSV مرفق.</p>
        </AdminNotice>
      ) : null}
      {sp.sent === "0" ? (
        <AdminNotice tone="danger">
          <p>تعذّر إرسال البريد. تحقق من إعداد البريد ثم أعد المحاولة، أو نزّل الملف مباشرة.</p>
        </AdminNotice>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 print:hidden">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5 lg:block lg:overflow-visible">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#report-${section.id}`}
                className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground lg:w-full"
              >
                <span className="font-mono text-[11px] text-primary/70">{section.index}</span>
                <span className="min-w-0 lg:flex-1 lg:truncate">{section.title}</span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">{rowsIn[section.id]}</span>
              </a>
            ))}
          </nav>

          <div className="space-y-4 rounded-xl border bg-card p-4">
            <ExportGroup label="Excel" hint="ملف بأوراق منفصلة لكل قسم.">
              <a className={cn(adminPrimaryClass, "w-full")} href={file("all", "xlsx")}>
                التقرير الكامل
              </a>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {sections.map((section) => (
                  <a key={section.id} className={linkClass} href={file(section.id, "xlsx")}>
                    {section.title}
                  </a>
                ))}
              </div>
            </ExportGroup>
            <ExportGroup label="CSV" hint="للاستيراد في أدوات أخرى.">
              <div className="grid grid-cols-2 gap-1.5">
                <a className={linkClass} href={file("revenue", "csv")}>
                  الإيراد
                </a>
                <a className={linkClass} href={file("all", "csv")}>
                  كل الأقسام
                </a>
              </div>
            </ExportGroup>
            <ExportGroup label="Email" hint="يُرسل CSV بكل الأقسام إلى بريد حسابك.">
              <form action={emailReport.bind(null, locale, days)}>
                <button className={cn(adminGhostClass, "w-full")}>إرسال التقرير لبريدي</button>
              </form>
            </ExportGroup>
            <ExportGroup label="Print" hint="اختر «حفظ بصيغة PDF» من نافذة الطباعة.">
              <PrintButton className="w-full" />
            </ExportGroup>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <Section id="revenue" action={<FileLinks xlsx={file("revenue", "xlsx")} csv={file("revenue", "csv")} />}>
            <Metrics
              items={[
                { label: `إيراد ${days} يوماً`, value: egp(data.revenueNow) },
                { label: "الفترة السابقة", value: egp(data.revenuePrevious) },
                {
                  label: "التغيّر",
                  value: revenueChange === null ? "—" : `${revenueChange > 0 ? "+" : ""}${revenueChange}%`,
                  tone: revenueChange === null ? undefined : revenueChange >= 0 ? "text-emerald-300" : "text-rose-300",
                },
                { label: "طلبات مدفوعة", value: count(paidOps) },
              ]}
            />
            {revenueRows.length === 0 ? (
              <Empty>لا مدفوعات في هذه الفترة.</Empty>
            ) : (
              <Table head={["اليوم", "الإيراد", "طلبات مدفوعة", "من أعلى يوم"]}>
                {revenueRows.map((row) => (
                  <tr key={row.day} className={adminTrClass}>
                    <td className={cn(adminTdClass, "font-mono text-xs tabular-nums")}>{row.day}</td>
                    <td className={cn(adminTdClass, "font-mono tabular-nums")}>{egp(row.revenue)}</td>
                    <td className={cn(adminTdClass, "font-mono tabular-nums")}>{count(row.n)}</td>
                    <td className={cn(adminTdClass, "w-48")}>
                      <Bar value={row.revenue} max={maxRevenue} tone="success" />
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30">
                  <td className={cn(adminTdClass, "text-xs font-medium")}>المجموع</td>
                  <td className={cn(adminTdClass, "font-mono font-semibold tabular-nums")}>{egp(data.revenueNow)}</td>
                  <td className={cn(adminTdClass, "font-mono font-semibold tabular-nums")}>{count(paidOps)}</td>
                  <td className={adminTdClass} />
                </tr>
              </Table>
            )}
          </Section>

          <Section id="operations" action={<FileLinks xlsx={file("operations", "xlsx")} csv={file("operations", "csv")} />}>
            <Metrics
              items={[
                { label: "طلبات جديدة", value: count(data.applications) },
                { label: "مقبول", value: count(data.approved), tone: "text-emerald-300" },
                { label: "مرفوض", value: count(data.rejected), tone: data.rejected ? "text-rose-300" : undefined },
                { label: "متوسط المعالجة", value: `${data.avgHours.toFixed(1)} س` },
                { label: "في الموعد", value: count(data.onTime) },
                { label: "متأخر", value: count(data.late), tone: data.late ? "text-amber-200" : undefined },
                { label: "نسبة الالتزام", value: data.onTime + data.late ? `${onTimeRate}%` : "—" },
                { label: "معدل القبول", value: decided ? `${approval}%` : "—" },
              ]}
            />
            {applicationRows.length === 0 ? (
              <Empty>لا طلبات جديدة في هذه الفترة.</Empty>
            ) : (
              <Table head={["اليوم", "الطلبات", "من أعلى يوم"]}>
                {applicationRows.map((row) => (
                  <tr key={row.day} className={adminTrClass}>
                    <td className={cn(adminTdClass, "font-mono text-xs tabular-nums")}>{row.day}</td>
                    <td className={cn(adminTdClass, "font-mono tabular-nums")}>{count(row.n)}</td>
                    <td className={cn(adminTdClass, "w-48")}>
                      <Bar value={row.n} max={maxApplications} />
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          <Section id="staff" action={<FileLinks xlsx={file("staff", "xlsx")} csv={file("staff", "csv")} />}>
            {data.staff.length === 0 ? (
              <Empty>لا يوجد موظفون بعد.</Empty>
            ) : (
              <Table head={["الموظف", "ملفات مغلقة", "مقبول", "معدل القبول", "متوسط الساعات"]}>
                {data.staff.map((row) => (
                  <tr key={row.label} className={cn(adminTrClass, row.processed === 0 && "text-muted-foreground")}>
                    <td className={cn(adminTdClass, "max-w-[220px] truncate")}>{row.label}</td>
                    <td className={cn(adminTdClass, "w-44")}>
                      <div className="flex items-center gap-3">
                        <span className="w-6 font-mono tabular-nums">{row.processed}</span>
                        <span className="min-w-0 flex-1">
                          <Bar value={row.processed} max={maxProcessed} tone="success" />
                        </span>
                      </div>
                    </td>
                    <td className={cn(adminTdClass, "font-mono tabular-nums")}>{count(row.approved)}</td>
                    <td className={cn(adminTdClass, "font-mono tabular-nums")}>{row.processed ? `${pct(row.approved, row.processed)}%` : "—"}</td>
                    <td className={cn(adminTdClass, "font-mono tabular-nums")}>{row.processed ? `${row.hours} س` : "—"}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>

          <Section id="quality" action={<FileLinks xlsx={file("quality", "xlsx")} csv={file("quality", "csv")} />}>
            <Metrics
              items={[
                { label: "معدل القبول", value: decided ? `${approval}%` : "—" },
                { label: "مدفوع", value: count(data.paid), tone: "text-emerald-300" },
                { label: "مسترد", value: count(data.refunded) },
                { label: "فشل الدفع", value: count(data.failed), tone: data.failed ? "text-rose-300" : undefined },
                { label: "تقييم الموقع", value: data.reviewCount ? `${data.reviewRating.toFixed(1)} / 5` : "—" },
                { label: "مستندات مرفوضة", value: count(rejections) },
              ]}
            />
            {data.documentRejections.length === 0 ? (
              <Empty>لم يُرفض أي مستند في هذه الفترة.</Empty>
            ) : (
              <Table head={["سبب رفض المستند", "العدد", "الحصة"]}>
                {data.documentRejections.map((row) => (
                  <tr key={row.label} className={adminTrClass}>
                    <td className={adminTdClass}>{row.label}</td>
                    <td className={cn(adminTdClass, "font-mono tabular-nums")}>{count(row.n)}</td>
                    <td className={cn(adminTdClass, "w-56")}>
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1">
                          <Bar value={row.n} max={rejections} tone="danger" />
                        </span>
                        <span className="w-10 text-end font-mono text-xs tabular-nums text-muted-foreground">{pct(row.n, rejections)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>
        </div>
      </div>
    </AdminPage>
  );
}

function Section({ id, action, children }: { id: (typeof sections)[number]["id"]; action: ReactNode; children: ReactNode }) {
  const section = sections.find((item) => item.id === id)!;
  return (
    <AdminPanel
      id={`report-${id}`}
      title={
        <span className="flex items-baseline gap-2.5">
          <span className="font-mono text-[11px] tracking-[0.2em] text-primary/80">{section.index}</span>
          <span className="text-base">{section.title}</span>
        </span>
      }
      hint={section.hint}
      action={<span className="print:hidden">{action}</span>}
      flush
    >
      {children}
    </AdminPanel>
  );
}

function FileLinks({ xlsx, csv }: { xlsx: string; csv: string }) {
  return (
    <span className="flex gap-1.5">
      <a className={linkClass} href={xlsx}>
        Excel
      </a>
      <a className={linkClass} href={csv}>
        CSV
      </a>
    </span>
  );
}

function ExportGroup({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="border-b pb-4 last:border-0 last:pb-0">
      <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">{label.toUpperCase()}</p>
      <p className="mb-2.5 mt-1 text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function Metrics({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-px border-b bg-border", items.length % 4 === 0 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-card px-5 py-4">
          <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
          <dd className={cn("mt-1 truncate font-mono text-lg font-semibold tabular-nums", item.tone)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="max-h-[420px] overflow-auto print:max-h-none print:overflow-visible">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="sticky top-0 z-[1] bg-card">
          <tr className="border-b">
            {head.map((cell) => (
              <th key={cell} className={adminThClass}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="p-5">
      <AdminEmpty>{children}</AdminEmpty>
    </div>
  );
}
