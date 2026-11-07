"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { removeStaffProfile, updateStaffProfile } from "@/app/actions/staff";
import { AdminEmpty, AdminNotice, Bar, FilterChip, Pill, adminGhostClass } from "@/components/admin/chrome";
import { ConfirmButton } from "@/components/admin/chrome-client";
import { Switch } from "@/components/admin/people/overlay";
import { Avatar, RoleBadge } from "@/components/admin/people/ui";
import { href } from "@/lib/href";
import { canManageUser } from "@/lib/rbac-constants";
import { cn } from "@/lib/utils";
import { StaffEditorSheet } from "./staff-editor";
import { capacity, hours, isActive, loadTone, type StaffAccess, type StaffMember } from "./staff-shared";

type Filter = "all" | "active" | "inactive" | "overloaded";

export function StaffTable({ locale, members, access, departments }: { locale: string; members: StaffMember[]; access: StaffAccess; departments: string[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const searched = needle
    ? members.filter((member) =>
        `${member.fullName ?? ""} ${member.email} ${member.profile?.department ?? ""} ${member.profile?.specialty.join(" ") ?? ""}`.toLowerCase().includes(needle),
      )
    : members;
  const matches = (member: StaffMember, value: Filter) =>
    value === "all" ? true : value === "active" ? isActive(member) : value === "inactive" ? !isActive(member) : isActive(member) && member.open >= capacity(member);
  const shown = searched.filter((member) => matches(member, filter));
  const editing = members.find((member) => member.id === editingId) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالاسم أو البريد أو القسم…"
          className="h-9 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-72"
        />
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {(
            [
              ["all", "الكل"],
              ["active", "نشط"],
              ["inactive", "معطّل"],
              ["overloaded", "فوق الطاقة"],
            ] as const
          ).map(([value, label]) => (
            <FilterChip key={value} active={filter === value} onClick={() => setFilter(value)}>
              {label} <span className="ms-1 font-mono tabular-nums opacity-70">{searched.filter((member) => matches(member, value)).length}</span>
            </FilterChip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <AdminEmpty title={members.length ? "لا يوجد موظفون مطابقون" : "لا يوجد موظفون بعد"}>
          {members.length ? "غيّر البحث أو الفلتر." : "أضف أول موظف بترقية حساب موجود من زر «إضافة موظف»."}
        </AdminEmpty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((member) => (
            <StaffCard key={member.id} locale={locale} member={member} access={access} onEdit={() => setEditingId(member.id)} />
          ))}
        </div>
      )}

      {editing ? (
        <StaffEditorSheet
          key={`${editing.id}-${editing.role}`}
          locale={locale}
          member={editing}
          access={access}
          departments={departments}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </section>
  );
}

function StaffCard({ locale, member, access, onEdit }: { locale: string; member: StaffMember; access: StaffAccess; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = isActive(member);
  const max = capacity(member);
  const capacityTone = loadTone(member.open, max);
  const tone = member.late && capacityTone === "success" ? "warning" : capacityTone;
  const self = member.id === access.currentUserId;
  const manageable = canManageUser(access.currentRole, member.role);
  const perf = member.perf;
  const rate = perf && perf.processed ? Math.round((perf.approved / perf.processed) * 100) : null;

  const toggle = (value: boolean) =>
    start(async () => {
      setError(null);
      const profile = member.profile;
      const result = await updateStaffProfile(
        member.id,
        {
          department: profile?.department ?? null,
          specialty: profile?.specialty ?? [],
          maxApplications: max,
          notes: profile?.notes ?? null,
          active: value,
          hiredAt: profile?.hiredAt ?? null,
        },
        locale,
      );
      if (!result.success) setError(result.error);
    });

  const remove = () =>
    start(async () => {
      setError(null);
      const result = await removeStaffProfile(member.id, locale);
      if (!result.success) setError(result.error);
    });

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-card transition-colors",
        !active && "opacity-75",
        active && member.open >= max && "border-rose-500/40",
      )}
    >
      <header className="flex items-start gap-3 p-5 pb-4">
        <Avatar name={member.fullName} email={member.email} tone={active ? "primary" : "muted"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {member.fullName ? (
              <p className="truncate font-semibold">{member.fullName}</p>
            ) : (
              <p dir="ltr" className="truncate text-start font-mono text-sm font-semibold">
                {member.email}
              </p>
            )}
            <RoleBadge role={member.role} className="shrink-0" />
          </div>
          {member.fullName ? (
            <p dir="ltr" className="mt-0.5 truncate text-start font-mono text-xs text-muted-foreground">
              {member.email}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className={member.profile?.department ? "text-foreground/85" : "text-muted-foreground"}>{member.profile?.department || "بدون قسم"}</span>
            {member.profile?.specialty.map((item) => (
              <span key={item} dir="auto" className="rounded border border-border px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                {item}
              </span>
            ))}
            {member.banned ? <Pill tone="danger">محظور</Pill> : null}
            {self ? <span className="rounded border border-primary/40 px-1.5 text-[10px] text-primary">أنت</span> : null}
          </div>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-5">
        <div>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">عبء العمل</span>
            <span className="font-mono tabular-nums">
              <span className={cn("text-sm font-semibold", tone === "danger" ? "text-rose-300" : tone === "warning" ? "text-amber-200" : "text-foreground")}>{member.open}</span>
              <span className="text-muted-foreground"> / {max}</span>
            </span>
          </div>
          <div className="mt-2">
            <Bar value={member.open} max={max} tone={tone} />
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
            <span>{member.open >= max ? "فوق الطاقة: لن يُسند إليه تلقائياً" : `${max - member.open} مكان متاح`}</span>
            {member.late ? <span className="text-rose-300">· {member.late} متأخر عن الموعد</span> : null}
            {member.open ? (
              <Link href={href(`/admin/applications?assignee=${member.id}`, locale)} className="text-primary hover:underline">
                · عرض الملفات
              </Link>
            ) : null}
          </p>
        </div>

        <dl className="grid grid-cols-3 divide-x divide-border/70 rounded-lg border bg-background/40 py-2.5 text-center">
          <div>
            <dt className="text-[11px] text-muted-foreground">معالَج 30 يوماً</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{perf ? perf.processed : "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">نسبة القبول</dt>
            <dd className={cn("mt-0.5 font-mono text-sm font-semibold tabular-nums", rate != null && rate >= 80 && "text-emerald-300")}>{rate != null ? `${rate}%` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">متوسط المعالجة</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{perf ? hours(perf.avgHours) : "—"}</dd>
          </div>
        </dl>

        {!member.profile ? <p className="text-[11px] text-amber-200/90">لا يوجد ملف موظف بعد. افتح التعديل لتحديد القسم والحد الأقصى.</p> : null}
        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
        <Switch checked={active && !member.banned} onChange={toggle} disabled={!access.canManage || pending || member.banned} label={active ? "نشط" : "معطّل"} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit} disabled={!access.canManage} className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
            تعديل
          </button>
          <ConfirmButton
            onConfirm={remove}
            disabled={!access.canManage || self || !manageable || pending}
            confirmLabel="تأكيد الإزالة"
            className="h-8 px-3 text-xs"
          >
            إزالة
          </ConfirmButton>
        </div>
      </footer>
    </article>
  );
}
