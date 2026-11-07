import Link from "next/link";
import { ApplicationWorkbench } from "@/components/admin/application-tools";
import { AdminPage, Segmented, adminGhostClass } from "@/components/admin/chrome";
import { statusLabels } from "@/components/admin/status";
import { allStatuses } from "@/components/admin/applications/model";
import { AutoAssignButton } from "@/components/admin/applications/auto-assign";
import { ApplicationFilters, type FilterValues } from "@/components/admin/applications/filters";
import { requireAdmin } from "@/lib/auth";
import { applicationSignals, databaseNow } from "@/lib/data/admin-applications";
import { applicationStats, countApplications, listAllApplications } from "@/lib/data/applications";
import { listDestinations } from "@/lib/data/catalog";
import { listUsers } from "@/lib/data/users";
import { isStaffRole } from "@/lib/rbac-constants";
import { listAllVisaOptions, visaOptionStats } from "@/lib/data/visa-options";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { cn } from "@/lib/utils";

export const metadata = { title: "الطلبات" };

const uuid = /^[0-9a-f-]{36}$/i;
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminApplicationsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  const text = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string).trim() : "");
  const status = text("status") || undefined;
  const q = text("q") || undefined;
  const from = isoDay.test(text("from")) ? text("from") : undefined;
  const to = isoDay.test(text("to")) ? text("to") : undefined;
  const destination = text("destination") || undefined;
  const option = uuid.test(text("option")) ? text("option") : undefined;
  const assignee = uuid.test(text("assignee")) ? text("assignee") : undefined;
  const paid: "paid" | "unpaid" | undefined = sp.paid === "paid" ? "paid" : sp.paid === "unpaid" ? "unpaid" : undefined;
  const timing = sp.timing === "late" ? ("late" as const) : undefined;
  const board = sp.view === "board";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const pageSize = 50;
  const filter = { status, q, from, to, destination, option, assignee, paid, timing };
  const [apps, stats, total, destinations, visaOptions, optionStats, users, now] = await Promise.all([
    listAllApplications({ ...filter, limit: board ? 80 : pageSize, offset: board ? 0 : (page - 1) * pageSize }),
    applicationStats(),
    countApplications(filter),
    listDestinations({ includeInactive: true }),
    listAllVisaOptions(),
    visaOptionStats(destination),
    listUsers(),
    databaseNow(),
  ]);
  const signals = await applicationSignals(apps.map((app) => app.id));
  const staff = users.filter((user) => isStaffRole(user.role) && user.role !== "viewer").map((user) => ({ id: user.id, label: user.fullName || user.email }));
  const names = Object.fromEntries(users.map((user) => [user.id, user.fullName || user.email]));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (destination) query.set("destination", destination);
  if (option) query.set("option", option);
  if (assignee) query.set("assignee", assignee);
  if (paid) query.set("paid", paid);
  if (timing) query.set("timing", timing);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const filterQuery = query.toString();
  if (board) query.set("view", "board");

  const link = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(query);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in patch)) next.delete("page");
    const value = next.toString();
    return href(`/admin/applications${value ? `?${value}` : ""}`, locale);
  };

  const counts = new Map(stats.map((row) => [row.status, row.count]));
  const destinationName = (slug: string) => destinations.find((row) => row.slug === slug)?.name ?? slug;
  const optionStat = new Map(optionStats.map((row) => [row.id, row.total]));
  const optionGroups = destinations
    .map((row) => ({
      destination: row.slug,
      name: row.name,
      items: visaOptions
        .filter((item) => item.destinationId === row.id)
        .map((item) => ({ value: item.id, label: item.labelAr || item.label, count: destination ? optionStat.get(item.id) : undefined })),
    }))
    .filter((group) => group.items.length);
  const optionLabel = (id: string) => {
    const item = visaOptions.find((row) => row.id === id);
    return item ? item.labelAr || item.label : "نوع محدد";
  };

  const chips: { label: string; remove: Record<string, null> }[] = [];
  if (q) chips.push({ label: `بحث: «${q}»`, remove: { q: null } });
  if (status) chips.push({ label: `الحالة: ${statusLabels[status] ?? status}`, remove: { status: null } });
  if (destination) chips.push({ label: `الوجهة: ${destinationName(destination)}`, remove: { destination: null } });
  if (option) chips.push({ label: `النوع: ${optionLabel(option)}`, remove: { option: null } });
  if (assignee) chips.push({ label: `المسؤول: ${names[assignee] ?? "موظف"}`, remove: { assignee: null } });
  if (paid) chips.push({ label: paid === "paid" ? "مدفوع" : "غير مدفوع", remove: { paid: null } });
  if (timing) chips.push({ label: "متأخر عن الموعد", remove: { timing: null } });
  if (from || to) {
    const range = from && to ? (from === to ? `يوم ${from}` : `من ${from} إلى ${to}`) : from ? `منذ ${from}` : `حتى ${to}`;
    chips.push({ label: range, remove: { from: null, to: null } });
  }

  const values: FilterValues = {
    q: q ?? "",
    status: status ?? "",
    destination: destination ?? "",
    option: option ?? "",
    assignee: assignee ?? "",
    paid: paid ?? "",
    timing: timing ?? "",
    from: from ?? "",
    to: to ?? "",
    view: board ? "board" : "",
  };
  const firstRow = total ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(total, page * pageSize);

  return (
    <AdminPage
      title="الطلبات"
      description="كل طلبات التأشيرة. ابحث، صفِّ، وحدّد عدة طلبات لتعيينها أو تغيير حالتها دفعة واحدة."
      action={
        <>
          <AutoAssignButton locale={locale} />
          <a className={adminGhostClass} href={`/api/admin/applications.csv?${filterQuery}`}>
            <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-none stroke-current" strokeWidth="1.5">
              <path d="M8 2.5v7m0 0 3-3m-3 3-3-3M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            تصدير CSV
          </a>
          <Segmented
            items={[
              { href: link({ view: null }), label: "جدول", active: !board },
              { href: link({ view: "board" }), label: "لوحة الحالات", active: board },
            ]}
          />
        </>
      }
    >
      <ApplicationFilters
        key={filterQuery}
        locale={locale}
        values={values}
        statuses={allStatuses.map((value) => ({ value, label: statusLabels[value] ?? value, count: counts.get(value) ?? 0 }))}
        destinations={destinations.map((row) => ({ value: row.slug, label: row.name }))}
        options={optionGroups}
        staff={staff.map((person) => ({ value: person.id, label: person.label }))}
        today={today}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            {total} طلب{chips.length ? " مطابق" : ""}
            {!board && total > pageSize ? ` · يُعرض ${firstRow}–${lastRow}` : ""}
            {board && total > apps.length ? ` · اللوحة تعرض أحدث ${apps.length}` : ""}
          </p>
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={link(chip.remove)}
              className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.08] py-0.5 pe-2 ps-3 text-xs text-sky-200 transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-200"
              title="إزالة الفلتر"
            >
              <span className="truncate">{chip.label}</span>
              <svg viewBox="0 0 12 12" aria-hidden className="size-3 shrink-0 fill-none stroke-current opacity-70 group-hover:opacity-100" strokeWidth="1.6">
                <path d="m3.5 3.5 5 5m0-5-5 5" strokeLinecap="round" />
              </svg>
            </Link>
          ))}
          {chips.length > 1 ? (
            <Link href={href(`/admin/applications${board ? "?view=board" : ""}`, locale)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              مسح الكل
            </Link>
          ) : null}
        </div>
        {!board && pages > 1 ? <Pager page={page} pages={pages} link={(value) => link({ page: String(value) })} /> : null}
      </div>

      <ApplicationWorkbench locale={locale} applications={apps} staff={staff} board={board} signals={signals} names={names} now={now} />

      {!board && pages > 1 ? (
        <div className="flex justify-end">
          <Pager page={page} pages={pages} link={(value) => link({ page: String(value) })} />
        </div>
      ) : null}
    </AdminPage>
  );
}

function Pager({ page, pages, link }: { page: number; pages: number; link: (page: number) => string }) {
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
  const base = "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-mono text-xs tabular-nums transition-colors";
  return (
    <nav className="flex items-center gap-1" aria-label="الصفحات">
      {page > 1 ? (
        <Link href={link(page - 1)} className={cn(base, "border border-input text-muted-foreground hover:text-foreground")}>
          السابق
        </Link>
      ) : null}
      {numbers.map((value, index) => (
        <span key={value} className="flex items-center gap-1">
          {index > 0 && value - numbers[index - 1] > 1 ? <span className="px-0.5 text-xs text-muted-foreground">…</span> : null}
          <Link href={link(value)} aria-current={value === page ? "page" : undefined} className={cn(base, value === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {value}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={link(page + 1)} className={cn(base, "border border-input text-muted-foreground hover:text-foreground")}>
          التالي
        </Link>
      ) : null}
    </nav>
  );
}
