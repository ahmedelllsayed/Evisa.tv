import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminEmpty, AdminPage, AdminPanel, KeyValue, Pill, StatTile, adminGhostClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { count, egp, relativeTime, shortDateTime } from "@/components/admin/format";
import { auditDetail, auditLabel, auditTone } from "@/components/admin/people/audit-labels";
import { UserNotes } from "@/components/admin/people/user-notes";
import { Avatar, RoleBadge, TopicChip, shortDate } from "@/components/admin/people/ui";
import { UserProfileActions } from "@/components/admin/people/user-editor";
import { PaymentBadge, StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/auth";
import { getUserProfileDetail, listAuditForTargets, listMessagesFromEmail, listUserPayments } from "@/lib/data/admin-people";
import { listApplicationsForUser } from "@/lib/data/applications";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { currentUserHasPermission, getAssignableRoles } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export const metadata = { title: "ملف مستخدم" };

const ACTIVE = new Set(["payment_pending", "submitted", "in_review", "filed"]);

function money(amount: number, currency: string) {
  return currency.toUpperCase() === "EGP" ? egp(amount) : `${count(amount)} ${currency}`;
}

export default async function AdminUserPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const admin = await requireAdmin(locale);
  if (!(await currentUserHasPermission("users", "view"))) redirect(`/${locale}/admin`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await getUserProfileDetail(id);
  if (!profile) notFound();
  const [applications, payments, audit, messages, assignable, create, edit, ban, remove, changeRole] = await Promise.all([
    listApplicationsForUser(id),
    listUserPayments(id),
    listAuditForTargets([id, profile.email]),
    profile.anonymizedAt ? Promise.resolve([]) : listMessagesFromEmail(profile.email),
    getAssignableRoles(),
    currentUserHasPermission("users", "create"),
    currentUserHasPermission("users", "edit"),
    currentUserHasPermission("users", "ban"),
    currentUserHasPermission("users", "delete"),
    currentUserHasPermission("users", "change_role"),
  ]);
  const now = new Date();
  const paid = payments.filter((payment) => payment.status === "paid");
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = payments.filter((payment) => payment.status === "refunded").length;
  const active = applications.filter((app) => ACTIVE.has(app.status)).length;
  const lastApp = applications[0];
  const unread = messages.filter((message) => !message.readAt).length;
  const self = profile.id === admin.id;
  const access = { currentUserId: admin.id, currentRole: admin.role, assignable, can: { create, edit, ban, delete: remove, changeRole } };
  const user = {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    phone: profile.phone,
    role: profile.role,
    banned: profile.banned,
    anonymized: Boolean(profile.anonymizedAt),
    paidPayments: payments.filter((payment) => payment.status === "paid" || payment.status === "refunded").length,
    applicationCount: applications.length,
    createdAt: profile.createdAt,
  };

  return (
    <AdminPage
      title={profile.fullName || profile.email}
      description={profile.anonymizedAt ? "حساب محذوف. البيانات الشخصية مخفية، وتبقى الطلبات والمدفوعات للسجلات." : undefined}
      action={
        <Link href={href("/admin/users", locale)} className={adminGhostClass}>
          كل المستخدمين
        </Link>
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 [color-scheme:dark] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-start gap-4 border-b bg-gradient-to-b from-white/[0.02] to-transparent p-5">
              <Avatar name={profile.fullName} email={profile.email} size="lg" tone={profile.role === "user" ? "muted" : "primary"} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight">{profile.fullName || "بدون اسم"}</h2>
                  <RoleBadge role={profile.role} />
                  {profile.anonymizedAt ? <Pill>محذوف</Pill> : profile.banned ? <Pill tone="danger" dot>محظور</Pill> : <Pill tone="success" dot>نشط</Pill>}
                  {profile.totpEnabled ? <Pill tone="info">تحقق بخطوتين</Pill> : null}
                  {self ? <span className="rounded border border-primary/40 px-1.5 text-[10px] text-primary">أنت</span> : null}
                </div>
                {profile.anonymizedAt ? (
                  <p dir="ltr" className="mt-1 truncate text-start font-mono text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                ) : (
                  <a href={`mailto:${profile.email}`} dir="ltr" className="mt-1 block truncate text-start font-mono text-xs text-primary hover:underline">
                    {profile.email}
                  </a>
                )}
              </div>
            </div>
            <div className="p-5">
              <KeyValue
                items={[
                  { label: "الهاتف", value: profile.phone ? <span dir="ltr" className="font-mono">{profile.phone}</span> : <span className="text-muted-foreground">—</span> },
                  { label: "لغة الموقع", value: profile.locale ? (profile.locale.startsWith("ar") ? "العربية" : "English") : <span className="text-muted-foreground">—</span> },
                  {
                    label: "تاريخ الانضمام",
                    value: (
                      <span>
                        {shortDate(profile.createdAt)} <span className="text-xs text-muted-foreground">· {relativeTime(profile.createdAt, now)}</span>
                      </span>
                    ),
                  },
                  {
                    label: "آخر طلب",
                    value: lastApp ? (
                      <span>
                        {shortDate(lastApp.createdAt)} <span className="text-xs text-muted-foreground">· {relativeTime(lastApp.createdAt, now)}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">لم يقدّم طلباً بعد</span>
                    ),
                  },
                  { label: "معرّف الحساب", value: <span className="font-mono text-xs text-muted-foreground">{profile.id}</span> },
                  ...(profile.anonymizedAt ? [{ label: "حُذف في", value: <span className="font-mono text-xs">{shortDateTime(profile.anonymizedAt)}</span> }] : []),
                ]}
              />
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            <StatTile label="الطلبات" value={count(applications.length)} note={active ? `${active} قيد التنفيذ` : "لا طلبات مفتوحة"} tone={active ? "info" : "neutral"} />
            <StatTile label="المدفوع" value={<span className="text-2xl">{egp(paidTotal)}</span>} note={`${paid.length} دفعة${refunded ? ` · ${refunded} مستردة` : ""}`} tone={paidTotal ? "success" : "neutral"} />
            <StatTile label="رسائل التواصل" value={count(messages.length)} note={unread ? `${unread} غير مقروءة` : "لا رسائل جديدة"} tone={unread ? "warning" : "neutral"} />
            <StatTile label="نشاط الإدارة" value={count(audit.length)} note="عمليات على هذا الحساب" />
          </div>

          <AdminPanel title="الطلبات" hint={applications.length ? `${applications.length} طلب، الأحدث أولاً.` : undefined} flush>
            {applications.length === 0 ? (
              <div className="p-5">
                <AdminEmpty>لا توجد طلبات لهذا الحساب.</AdminEmpty>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b bg-background/40">
                    <tr>
                      <th className={adminThClass}>المرجع</th>
                      <th className={adminThClass}>الوجهة</th>
                      <th className={adminThClass}>الحالة</th>
                      <th className={cn(adminThClass, "text-end")}>المسافرون</th>
                      <th className={cn(adminThClass, "text-end")}>الإجمالي</th>
                      <th className={adminThClass}>أُنشئ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className={adminTrClass}>
                        <td className={adminTdClass}>
                          <Link href={href(`/admin/applications/${app.id}`, locale)} className="font-mono text-xs font-medium text-primary hover:underline">
                            {app.reference}
                          </Link>
                        </td>
                        <td className={adminTdClass}>
                          <p className="truncate">{app.destinationNameAr || app.destinationName}</p>
                          {app.visaLabelAr || app.visaLabel ? <p className="truncate text-xs text-muted-foreground">{app.visaLabelAr || app.visaLabel}</p> : null}
                        </td>
                        <td className={adminTdClass}>
                          <StatusBadge status={app.status} />
                        </td>
                        <td className={cn(adminTdClass, "text-end font-mono tabular-nums")}>{app.travelerCount}</td>
                        <td className={cn(adminTdClass, "text-end font-mono text-xs tabular-nums")}>{money(app.totalAmount, app.currency)}</td>
                        <td className={cn(adminTdClass, "text-xs text-muted-foreground")} title={shortDateTime(app.createdAt)}>
                          {relativeTime(app.createdAt, now)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <AdminPanel title="المدفوعات" flush>
              {payments.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">لا توجد مدفوعات.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <Link href={href(`/admin/applications/${payment.applicationId}`, locale)} className="font-mono text-xs text-primary hover:underline">
                          {payment.reference}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {payment.provider || "—"} · <span className="font-mono">{shortDateTime(payment.createdAt)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-sm tabular-nums">{money(payment.amount, payment.currency)}</span>
                        <PaymentBadge status={payment.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>

            <AdminPanel
              title="رسائل التواصل"
              flush
              action={
                messages.length ? (
                  <Link href={href(`/admin/messages?q=${encodeURIComponent(profile.email)}`, locale)} className="text-xs text-primary hover:underline">
                    فتح في الرسائل
                  </Link>
                ) : null
              }
            >
              {messages.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">لم يرسل رسائل من صفحة التواصل.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {messages.map((message) => (
                    <li key={message.id}>
                      <Link href={href(`/admin/messages?id=${message.id}`, locale)} className="block px-5 py-3 transition-colors hover:bg-accent/30">
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            {!message.readAt ? <span className="size-2 rounded-full bg-primary" /> : null}
                            <TopicChip topic={message.topic} />
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">{relativeTime(message.createdAt, now)}</span>
                        </span>
                        <span dir="auto" className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                          {message.body}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>
          </div>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-4">
          <AdminPanel title="الإجراءات">
            <UserProfileActions locale={locale} user={user} access={access} />
          </AdminPanel>
          <AdminPanel title="ملاحظات داخلية">
            <UserNotes locale={locale} userId={profile.id} initial={profile.staffNotes ?? ""} canEdit={edit} />
          </AdminPanel>
          <AdminPanel title="سجل النشاط على الحساب" flush>
            {audit.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">لا يوجد نشاط مسجّل.</p>
            ) : (
              <ol className="divide-y divide-border/70">
                {audit.map((row) => {
                  const detail = auditDetail(row.action, row.detail);
                  return (
                    <li key={row.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <Pill tone={auditTone(row.action)} className="px-2 py-0 text-[11px]">
                          {auditLabel(row.action)}
                        </Pill>
                        <span className="font-mono text-[11px] text-muted-foreground" title={shortDateTime(row.createdAt)}>
                          {relativeTime(row.createdAt, now)}
                        </span>
                      </div>
                      <p dir="ltr" className="mt-1 truncate text-start font-mono text-[11px] text-muted-foreground">
                        {row.actorEmail ?? "—"}
                      </p>
                      {detail ? <p className="mt-1 text-xs text-foreground/80">{detail}</p> : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </AdminPanel>
        </aside>
      </div>
    </AdminPage>
  );
}
