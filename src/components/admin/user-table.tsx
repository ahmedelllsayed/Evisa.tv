"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminEmpty, AdminNotice, AdminPage, FilterChip, Pill, StatTile, adminGhostClass, adminPrimaryClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { count, relativeTime } from "@/components/admin/format";
import { Avatar, RoleBadge, shortDate } from "@/components/admin/people/ui";
import { CreateUserSheet, UserEditorSheet, type PeopleUser, type UserAccess } from "@/components/admin/people/user-editor";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

type Segment = "all" | "customers" | "staff" | "banned" | "deleted";
type Sort = "newest" | "oldest" | "applications" | "name";

const PAGE = 50;

function UserState({ user }: { user: PeopleUser }) {
  if (user.anonymized) return <Pill>محذوف</Pill>;
  if (user.banned) return <Pill tone="danger" dot>محظور</Pill>;
  return <Pill tone="success" dot>نشط</Pill>;
}

export function UserTable({
  locale,
  users,
  access,
  now,
  initialQuery = "",
}: {
  locale: string;
  users: PeopleUser[];
  access: UserAccess;
  now: string;
  initialQuery?: string;
}) {
  const nowDate = useMemo(() => new Date(now), [now]);
  const [query, setQuery] = useState(initialQuery);
  const [segment, setSegment] = useState<Segment>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [limit, setLimit] = useState(PAGE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const weekAgo = nowDate.getTime() - 7 * 86400000;
  const stats = {
    total: users.filter((user) => !user.anonymized).length,
    customers: users.filter((user) => !user.anonymized && user.role === "user").length,
    staff: users.filter((user) => !user.anonymized && user.role !== "user").length,
    banned: users.filter((user) => !user.anonymized && user.banned).length,
    deleted: users.filter((user) => user.anonymized).length,
    fresh: users.filter((user) => !user.anonymized && new Date(user.createdAt).getTime() >= weekAgo).length,
  };

  const needle = query.trim().toLowerCase();
  const inSegment = (user: PeopleUser, value: Segment) =>
    value === "all"
      ? !user.anonymized
      : value === "customers"
        ? !user.anonymized && user.role === "user"
        : value === "staff"
          ? !user.anonymized && user.role !== "user"
          : value === "banned"
            ? !user.anonymized && user.banned
            : user.anonymized;
  const searched = needle ? users.filter((user) => `${user.email} ${user.fullName ?? ""} ${user.phone ?? ""}`.toLowerCase().includes(needle)) : users;
  const segmentCount = (value: Segment) => searched.filter((user) => inSegment(user, value)).length;
  const shown = searched
    .filter((user) => inSegment(user, segment))
    .sort((a, b) => {
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt, "en");
      if (sort === "applications") return b.applicationCount - a.applicationCount || b.createdAt.localeCompare(a.createdAt, "en");
      if (sort === "name") return (a.fullName || a.email).localeCompare(b.fullName || b.email, "ar");
      return b.createdAt.localeCompare(a.createdAt, "en");
    });
  const page = shown.slice(0, limit);
  const editing = users.find((user) => user.id === editingId) ?? null;

  const segments: { value: Segment; label: string }[] = [
    { value: "all", label: "الكل" },
    { value: "customers", label: "العملاء" },
    { value: "staff", label: "الموظفون" },
    { value: "banned", label: "المحظورون" },
    ...(stats.deleted ? [{ value: "deleted" as const, label: "المحذوفة" }] : []),
  ];

  return (
    <AdminPage
      title="المستخدمون"
      description="كل الحسابات في مكان واحد: ابحث، عدّل البيانات والدور، أو احظر واحذف. لا يمكن حذف حسابك أو آخر مدير، ولا حذف حساب له مدفوعات."
      action={
        access.can.create ? (
          <button type="button" onClick={() => setCreating(true)} className={adminPrimaryClass}>
            إضافة مستخدم
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="إجمالي الحسابات" value={count(stats.total)} note={stats.fresh ? `+${stats.fresh} هذا الأسبوع` : "لا حسابات جديدة هذا الأسبوع"} />
        <StatTile label="العملاء" value={count(stats.customers)} tone="info" />
        <StatTile label="الموظفون" value={count(stats.staff)} tone="success" href={href("/admin/staff", locale)} note="إدارة الفريق والأعباء" />
        <StatTile label="المحظورون" value={count(stats.banned)} tone={stats.banned ? "danger" : "neutral"} note={stats.banned ? "لا يستطيعون تسجيل الدخول" : "لا يوجد حظر"} />
      </div>

      {notice ? (
        <AdminNotice tone="success">
          <span className="flex items-center justify-between gap-3">
            {notice}
            <button type="button" onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">
              إخفاء
            </button>
          </span>
        </AdminNotice>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card [color-scheme:dark]">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE);
            }}
            placeholder="ابحث بالبريد أو الاسم أو الهاتف…"
            className="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-72"
          />
          <div className="flex flex-wrap gap-1">
            {segments.map((item) => (
              <FilterChip
                key={item.value}
                active={segment === item.value}
                onClick={() => {
                  setSegment(item.value);
                  setLimit(PAGE);
                }}
              >
                {item.label} <span className="ms-1 font-mono tabular-nums opacity-70">{segmentCount(item.value)}</span>
              </FilterChip>
            ))}
          </div>
          <label className="ms-auto flex items-center gap-2 text-xs text-muted-foreground">
            ترتيب
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-primary"
            >
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="applications">الأكثر طلبات</option>
              <option value="name">الاسم</option>
            </select>
          </label>
        </div>

        {shown.length === 0 ? (
          <div className="p-5">
            <AdminEmpty title={users.length ? "لا توجد نتائج" : "لا يوجد مستخدمون بعد"}>
              {users.length ? "جرّب كلمة بحث أخرى أو فلتراً مختلفاً." : "أضف أول حساب من زر «إضافة مستخدم»."}
            </AdminEmpty>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="border-b bg-background/40">
                  <tr>
                    <th className={adminThClass}>الحساب</th>
                    <th className={adminThClass}>الهاتف</th>
                    <th className={adminThClass}>الدور</th>
                    <th className={cn(adminThClass, "text-end")}>الطلبات</th>
                    <th className={adminThClass}>الانضمام</th>
                    <th className={adminThClass}>الحالة</th>
                    <th className={adminThClass}>
                      <span className="sr-only">إجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setEditingId(user.id)}
                      className={cn(adminTrClass, "cursor-pointer", editingId === user.id && "bg-accent/40", user.anonymized && "opacity-60")}
                    >
                      <td className={adminTdClass}>
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={user.fullName} email={user.email} size="sm" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate font-medium">
                              {user.fullName || <span className="text-muted-foreground">بدون اسم</span>}
                              {user.id === access.currentUserId ? <span className="rounded border border-primary/40 px-1.5 text-[10px] text-primary">أنت</span> : null}
                            </p>
                            <p dir="ltr" className="truncate text-start font-mono text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={cn(adminTdClass, "font-mono text-xs text-muted-foreground")} dir="ltr">
                        {user.phone || "—"}
                      </td>
                      <td className={adminTdClass}>
                        <RoleBadge role={user.role} />
                      </td>
                      <td className={cn(adminTdClass, "text-end font-mono tabular-nums", !user.applicationCount && "text-muted-foreground")}>{user.applicationCount}</td>
                      <td className={adminTdClass}>
                        <p className="text-xs">{relativeTime(user.createdAt, nowDate)}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{shortDate(user.createdAt)}</p>
                      </td>
                      <td className={adminTdClass}>
                        <UserState user={user} />
                      </td>
                      <td className={cn(adminTdClass, "text-end")} onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => setEditingId(user.id)} className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
                            تعديل
                          </button>
                          <Link href={href(`/admin/users/${user.id}`, locale)} className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
                            الملف
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border/70 md:hidden">
              {page.map((user) => (
                <li key={user.id} className={cn(user.anonymized && "opacity-60")}>
                  <button type="button" onClick={() => setEditingId(user.id)} className="flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-accent/30">
                    <Avatar name={user.fullName} email={user.email} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{user.fullName || "بدون اسم"}</span>
                        <UserState user={user} />
                      </span>
                      <span dir="ltr" className="mt-0.5 block truncate text-start font-mono text-xs text-muted-foreground">
                        {user.email}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <RoleBadge role={user.role} />
                        <span>
                          <span className="font-mono tabular-nums text-foreground">{user.applicationCount}</span> طلب
                        </span>
                        <span>· {relativeTime(user.createdAt, nowDate)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
              <span>
                يعرض <span className="font-mono tabular-nums text-foreground">{page.length}</span> من{" "}
                <span className="font-mono tabular-nums text-foreground">{shown.length}</span>
              </span>
              {shown.length > page.length ? (
                <button type="button" onClick={() => setLimit((value) => value + PAGE)} className={cn(adminGhostClass, "h-8 text-xs")}>
                  عرض {Math.min(PAGE, shown.length - page.length)} إضافية
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>

      {editing ? (
        <UserEditorSheet
          key={editing.id}
          open
          onClose={() => setEditingId(null)}
          locale={locale}
          user={editing}
          access={access}
          onDeleted={(email) => {
            setNotice(`حُذف الحساب ${email} وأُخفيت بياناته.`);
            setEditingId(null);
          }}
        />
      ) : null}
      <CreateUserSheet
        open={creating}
        onClose={() => setCreating(false)}
        locale={locale}
        assignable={access.assignable}
        onCreated={(email) => {
          setNotice(`أُضيف الحساب ${email}.`);
          setQuery(email);
          setSegment("all");
        }}
      />
    </AdminPage>
  );
}
