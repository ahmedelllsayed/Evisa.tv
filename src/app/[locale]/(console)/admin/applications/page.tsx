import Link from "next/link";
import { ApplicationTable } from "@/components/admin/application-table";
import { AdminPage, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { statusLabels } from "@/components/admin/status";
import { requireAdmin } from "@/lib/auth";
import { applicationStats, listAllApplications } from "@/lib/data/applications";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { cn } from "@/lib/utils";

export const metadata = { title: "الطلبات" };

export default async function AdminApplicationsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const [apps, stats] = await Promise.all([listAllApplications({ status, q }), applicationStats()]);
  return (
    <AdminPage title="الطلبات" description="ابحث برقم الطلب أو البريد، وصفِّ حسب الحالة.">
      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink locale={locale} href="/admin/applications" active={!status} label="الكل" />
        {stats.map((row) => (
          <FilterLink
            key={row.status}
            locale={locale}
            href={`/admin/applications?status=${row.status}`}
            active={status === row.status}
            label={`${statusLabels[row.status] ?? row.status} · ${row.count}`}
          />
        ))}
      </div>
      <form className="mt-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="ابحث برقم الطلب أو البريد" className={cn(adminInputClass, "mt-0 flex-1")} />
        {status && <input type="hidden" name="status" value={status} />}
        <button className={adminPrimaryClass}>بحث</button>
      </form>
      <div className="mt-4">
        <ApplicationTable locale={locale} applications={apps} />
      </div>
    </AdminPage>
  );
}

function FilterLink({ locale, href: path, active, label }: { locale: string; href: string; active: boolean; label: string }) {
  return (
    <Link href={href(path, locale)} className={cn("rounded-full px-3 py-1", active ? "bg-brand text-white" : "bg-white text-ink")}>
      {label}
    </Link>
  );
}
