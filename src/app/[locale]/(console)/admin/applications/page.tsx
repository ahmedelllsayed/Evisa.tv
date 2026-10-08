import Link from "next/link";
import { ApplicationTable } from "@/components/admin/application-table";
import { AdminPage, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { statusLabels } from "@/components/admin/status";
import { requireAdmin } from "@/lib/auth";
import { applicationStats, countApplications, listAllApplications } from "@/lib/data/applications";
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
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const destination = typeof sp.destination === "string" ? sp.destination : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 50;
  const [apps, stats, total] = await Promise.all([
    listAllApplications({ status, q, from, to, destination, limit: pageSize, offset: (page - 1) * pageSize }),
    applicationStats(),
    countApplications({ status, q }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (q) query.set("q", q);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (destination) query.set("destination", destination);
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
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="ابحث برقم الطلب أو البريد" className={cn(adminInputClass, "mt-0 min-w-0 flex-1")} />
        <input name="destination" defaultValue={destination} placeholder="رمز الوجهة" className={cn(adminInputClass, "mt-0 w-32")} />
        <input name="from" type="date" defaultValue={from} className={cn(adminInputClass, "mt-0 w-36")} />
        <input name="to" type="date" defaultValue={to} className={cn(adminInputClass, "mt-0 w-36")} />
        {status && <input type="hidden" name="status" value={status} />}
        <button className={adminPrimaryClass}>بحث</button>
        <a className="rounded-full border border-line px-4 py-2 text-sm" href={`/api/admin/applications.csv?${query.toString()}`}>CSV</a>
      </form>
      <div className="mt-4">
        <ApplicationTable locale={locale} applications={apps} />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>{total} طلب</span>
        <span className="flex gap-3">
          {page > 1 && <Link href={href(`/admin/applications?${query.toString()}&page=${page - 1}`, locale)}>السابق</Link>}
          <span>{page} / {pages}</span>
          {page < pages && <Link href={href(`/admin/applications?${query.toString()}&page=${page + 1}`, locale)}>التالي</Link>}
        </span>
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
