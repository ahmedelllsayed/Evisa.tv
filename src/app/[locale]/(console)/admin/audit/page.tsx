import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminEmpty, AdminPage, Pill, Segmented, adminGhostClass, adminInputClass, adminPrimaryClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { count, relativeTime, shortDateTime } from "@/components/admin/format";
import { auditDetail, auditGroup, auditGroupLabel, auditLabel, auditTone } from "@/components/admin/people/audit-labels";
import { requireAdmin } from "@/lib/auth";
import { auditFacets, listAudit, type AuditEntry, type AuditFilter } from "@/lib/data/admin-people";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export const metadata = { title: "سجل النشاط" };

const PER_PAGE = 50;
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reference = /^[A-Z]{2,}-[A-Z0-9-]+$/;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cairoOffsetMinutes(date: Date) {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", timeZoneName: "longOffset" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(name);
  if (!match) return 120;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

/** UTC instant of 00:00 Cairo time on `day` (YYYY-MM-DD), shifted by `addDays`. */
function cairoMidnight(day: string, addDays = 0) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const guess = new Date(Date.UTC(y, m - 1, d + addDays));
  return new Date(guess.getTime() - cairoOffsetMinutes(guess) * 60000).toISOString();
}

function cairoDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function shiftDay(day: string, days: number) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function targetHref(entry: AuditEntry, locale: string) {
  const target = entry.target;
  if (!target) return null;
  const group = auditGroup(entry.action);
  if (uuid.test(target)) {
    if (group === "user" || group === "staff") return href(`/admin/users/${target}`, locale);
    if (group === "message") return href(`/admin/messages?id=${target}`, locale);
    if (group === "application" || group === "payment") return href(`/admin/applications/${target}`, locale);
    return null;
  }
  if (reference.test(target)) return href(`/admin/applications?q=${encodeURIComponent(target)}`, locale);
  if ((group === "user" || group === "staff") && email.test(target)) return href(`/admin/users?q=${encodeURIComponent(target)}`, locale);
  return null;
}

function agentLabel(agent: string) {
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : null;
  const os = /Windows/.test(agent) ? "Windows" : /iPhone|iPad/.test(agent) ? "iOS" : /Android/.test(agent) ? "Android" : /Mac OS/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ") || agent.slice(0, 32);
}

export default async function AdminAuditPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  if (!(await currentUserHasPermission("audit", "view"))) redirect(`/${locale}/admin`);

  const text = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string).trim() : "");
  const actor = text("actor").slice(0, 120);
  const action = /^[a-z_]+(\.[a-z_]+)?$/.test(text("action")) ? text("action") : "";
  const from = isoDay.test(text("from")) ? text("from") : "";
  const to = isoDay.test(text("to")) ? text("to") : "";
  const requested = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const filter: AuditFilter = {
    actor: actor || undefined,
    action: action || undefined,
    from: from ? cairoMidnight(from) : undefined,
    to: to ? cairoMidnight(to, 1) : undefined,
  };
  const [facets, first] = await Promise.all([auditFacets(filter), listAudit(filter, requested, PER_PAGE)]);
  const pages = Math.max(1, Math.ceil(first.total / PER_PAGE));
  const page = Math.min(requested, pages);
  const { rows, total } = page === requested ? first : await listAudit(filter, page, PER_PAGE);
  const now = new Date();
  const today = cairoDay(now);
  const showIp = rows.some((row) => row.ip);
  const showAgent = rows.some((row) => row.userAgent);
  const filtered = Boolean(actor || action || from || to);

  const link = (patch: Record<string, string | number | null>) => {
    const query = new URLSearchParams();
    const merged: Record<string, string | number | null> = { actor: actor || null, action: action || null, from: from || null, to: to || null, ...patch };
    for (const [key, value] of Object.entries(merged)) if (value !== null && value !== "" && !(key === "page" && value === 1)) query.set(key, String(value));
    const search = query.toString();
    return href(`/admin/audit${search ? `?${search}` : ""}`, locale);
  };

  const groupTotal = facets.groups.reduce((sum, group) => sum + group.count, 0);
  const activePrefix = action.split(".")[0] ?? "";
  const ranges = [
    { label: "اليوم", from: today, to: today },
    { label: "7 أيام", from: shiftDay(today, -6), to: today },
    { label: "30 يوماً", from: shiftDay(today, -29), to: today },
  ];
  const startIndex = total ? (page - 1) * PER_PAGE + 1 : 0;

  return (
    <AdminPage
      title="سجل النشاط"
      description="كل عملية حساسة في لوحة الإدارة: من نفّذها، وعلى ماذا، ومتى. السجل للقراءة فقط."
      action={
        <Pill>
          <span className="font-mono tabular-nums">{count(total)}</span> عملية{filtered ? " مطابقة" : ""}
        </Pill>
      }
    >
      <div className="[color-scheme:dark]">
        <Segmented
          items={[
            { href: link({ action: null, page: null }), label: "الكل", active: !action, count: groupTotal },
            ...facets.groups.map((group) => ({
              href: link({ action: group.prefix, page: null }),
              label: auditGroupLabel(group.prefix),
              active: activePrefix === group.prefix,
              count: group.count,
            })),
          ]}
        />
      </div>

      <form method="get" className="rounded-xl border bg-card p-4">
        {action ? <input type="hidden" name="action" value={action} /> : null}
        <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="col-span-2 block min-w-0 text-sm lg:col-span-1">
            <span className="font-medium text-foreground/90">المنفّذ</span>
            <input name="actor" defaultValue={actor} list="audit-actors" dir="ltr" placeholder="بريد الموظف أو جزء منه" className={cn(adminInputClass, "font-mono placeholder:font-sans")} />
            <datalist id="audit-actors">
              {facets.actors.map((item) => (
                <option key={item.email} value={item.email}>
                  {item.count}
                </option>
              ))}
            </datalist>
          </label>
          <label className="block min-w-0 text-sm">
            <span className="font-medium text-foreground/90">من تاريخ</span>
            <input type="date" name="from" defaultValue={from} max={to || today} className={cn(adminInputClass, "font-mono [color-scheme:dark]")} />
          </label>
          <label className="block min-w-0 text-sm">
            <span className="font-medium text-foreground/90">إلى تاريخ</span>
            <input type="date" name="to" defaultValue={to} min={from || undefined} max={today} className={cn(adminInputClass, "font-mono [color-scheme:dark]")} />
          </label>
          <div className="col-span-2 flex gap-2 lg:col-span-1">
            <button className={cn(adminPrimaryClass, "h-10")}>تطبيق</button>
            {filtered ? (
              <Link href={href("/admin/audit", locale)} className={cn(adminGhostClass, "h-10")}>
                مسح
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">نطاق سريع:</span>
          {ranges.map((range) => {
            const current = from === range.from && to === range.to;
            return (
              <Link
                key={range.label}
                href={link({ from: range.from, to: range.to, page: null })}
                className={cn("rounded-md px-2.5 py-1 transition-colors", current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              >
                {range.label}
              </Link>
            );
          })}
          {action ? (
            <span className="ms-auto flex items-center gap-1.5 text-muted-foreground">
              العملية:
              <span className="font-mono text-foreground">{action}</span>
              <Link href={link({ action: null, page: null })} className="text-primary hover:underline">
                إزالة
              </Link>
            </span>
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        <AdminEmpty
          title={filtered ? "لا توجد عمليات مطابقة" : "لا توجد عمليات مسجّلة بعد"}
          action={
            filtered ? (
              <Link href={href("/admin/audit", locale)} className={adminGhostClass}>
                مسح الفلاتر
              </Link>
            ) : undefined
          }
        >
          {filtered ? "وسّع النطاق الزمني أو غيّر المنفّذ." : "تظهر هنا تغييرات الإعدادات والمستخدمين والرسائل والمدفوعات."}
        </AdminEmpty>
      ) : (
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto [color-scheme:dark]">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="whitespace-nowrap border-b bg-background/40">
                <tr>
                  <th className={cn(adminThClass, "w-36")}>الوقت</th>
                  <th className={adminThClass}>المنفّذ</th>
                  <th className={adminThClass}>العملية</th>
                  <th className={adminThClass}>الهدف</th>
                  <th className={adminThClass}>التفاصيل</th>
                  {showIp ? <th className={adminThClass}>IP</th> : null}
                  {showAgent ? <th className={adminThClass}>الجهاز</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const detail = auditDetail(row.action, row.detail);
                  const target = targetHref(row, locale);
                  return (
                    <tr key={row.id} className={adminTrClass}>
                      <td className={adminTdClass}>
                        <p className="text-xs">{relativeTime(row.createdAt, now)}</p>
                        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{shortDateTime(row.createdAt)}</p>
                      </td>
                      <td className={adminTdClass}>
                        {row.actorEmail ? (
                          <Link href={link({ actor: row.actorEmail, page: null })} dir="ltr" className="block max-w-[220px] truncate text-start font-mono text-xs hover:text-primary" title="عرض عمليات هذا المنفّذ فقط">
                            {row.actorEmail}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">النظام</span>
                        )}
                      </td>
                      <td className={adminTdClass}>
                        <Link href={link({ action: row.action, page: null })} className="group inline-flex flex-col items-start gap-1">
                          <Pill tone={auditTone(row.action)} className="group-hover:brightness-125">
                            {auditLabel(row.action)}
                          </Pill>
                          <span className="font-mono text-[10px] text-muted-foreground/80">{row.action}</span>
                        </Link>
                      </td>
                      <td className={adminTdClass}>
                        {row.target ? (
                          target ? (
                            <Link href={target} dir="ltr" className="block max-w-[200px] truncate text-start font-mono text-xs text-primary hover:underline" title={row.target}>
                              {row.target}
                            </Link>
                          ) : (
                            <span dir="ltr" className="block max-w-[200px] truncate text-start font-mono text-xs text-foreground/80" title={row.target}>
                              {row.target}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cn(adminTdClass, "max-w-[320px]")}>
                        {detail ? (
                          <span dir="auto" className="line-clamp-2 text-xs leading-relaxed text-foreground/85" title={row.detail ?? undefined}>
                            {detail}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {showIp ? <td className={cn(adminTdClass, "font-mono text-xs text-muted-foreground")}>{row.ip ?? "—"}</td> : null}
                      {showAgent ? (
                        <td className={cn(adminTdClass, "text-xs text-muted-foreground")} title={row.userAgent ?? undefined}>
                          {row.userAgent ? agentLabel(row.userAgent) : "—"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>
              <span className="font-mono tabular-nums text-foreground">
                {startIndex}–{startIndex + rows.length - 1}
              </span>{" "}
              من <span className="font-mono tabular-nums text-foreground">{count(total)}</span>
            </span>
            {pages > 1 ? (
              <nav className="flex items-center gap-1.5" aria-label="الصفحات">
                {page > 1 ? (
                  <Link href={link({ page: page - 1 })} className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
                    الأحدث
                  </Link>
                ) : (
                  <span className={cn(adminGhostClass, "pointer-events-none h-8 px-3 text-xs opacity-40")}>الأحدث</span>
                )}
                <span className="px-2 font-mono tabular-nums">
                  {page} / {pages}
                </span>
                {page < pages ? (
                  <Link href={link({ page: page + 1 })} className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
                    الأقدم
                  </Link>
                ) : (
                  <span className={cn(adminGhostClass, "pointer-events-none h-8 px-3 text-xs opacity-40")}>الأقدم</span>
                )}
              </nav>
            ) : null}
          </footer>
        </section>
      )}
    </AdminPage>
  );
}
