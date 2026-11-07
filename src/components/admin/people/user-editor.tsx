"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { adminCreateUser, adminDeleteUser, adminSetUserBanned, adminUpdateUser } from "@/app/actions/admin";
import { AdminNotice, Labeled, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import { ConfirmButton, useEditorKeys } from "@/components/admin/chrome-client";
import { Sheet } from "@/components/admin/people/overlay";
import { Avatar, RoleBadge, shortDate } from "@/components/admin/people/ui";
import { href } from "@/lib/href";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, canManageUser } from "@/lib/rbac-constants";
import type { AdminRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PeopleUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: AdminRole;
  banned: boolean;
  anonymized: boolean;
  paidPayments: number;
  applicationCount: number;
  createdAt: string;
};

export type UserAccess = {
  currentUserId: string;
  currentRole: AdminRole;
  assignable: AdminRole[];
  can: { create: boolean; edit: boolean; ban: boolean; delete: boolean; changeRole: boolean };
};

type Values = { email: string; fullName: string; phone: string; role: AdminRole };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function userGuards(user: PeopleUser, access: UserAccess) {
  const self = user.id === access.currentUserId;
  const manageable = canManageUser(access.currentRole, user.role);
  const open = !user.anonymized;
  return {
    self,
    canEdit: open && access.can.edit && (self || manageable),
    canRole: open && access.can.changeRole && !self && manageable,
    canBan: open && access.can.ban && !self && manageable,
    canDelete: open && access.can.delete && !self && manageable,
    reason: user.anonymized
      ? "هذا الحساب محذوف وبياناته مخفية."
      : self
        ? "هذا حسابك الحالي: لا يمكن حظره أو حذفه أو تغيير دوره من هنا."
        : !manageable
          ? "دور هذا الحساب مساوٍ لدورك أو أعلى منه، لذلك لا يمكنك إدارته."
          : null,
  };
}

function toValues(user: PeopleUser): Values {
  return { email: user.email, fullName: user.fullName ?? "", phone: user.phone ?? "", role: user.role };
}

function roleOptions(current: AdminRole, assignable: AdminRole[]) {
  return assignable.includes(current) ? assignable : [current, ...assignable];
}

function UserFields({
  values,
  onChange,
  disabled,
  roleDisabled,
  roles,
  lockedRole,
  roleHint,
  autoFocus,
}: {
  values: Values;
  onChange: (values: Values) => void;
  disabled?: boolean;
  roleDisabled?: boolean;
  roles: AdminRole[];
  lockedRole?: AdminRole;
  roleHint?: ReactNode;
  autoFocus?: boolean;
}) {
  const set = (key: keyof Values) => (value: string) => onChange({ ...values, [key]: value });
  const emailBad = values.email.trim() !== "" && !emailPattern.test(values.email.trim());
  return (
    <div className="grid gap-4">
      <Labeled label="البريد الإلكتروني" hint={emailBad ? <span className="text-rose-400">البريد غير صالح.</span> : "يُستخدم لتسجيل الدخول برمز البريد."}>
        <input
          type="email"
          required
          dir="ltr"
          autoFocus={autoFocus}
          value={values.email}
          disabled={disabled}
          onChange={(event) => set("email")(event.target.value)}
          placeholder="name@example.com"
          className={cn(adminInputClass, "font-mono", emailBad && "border-rose-500/70")}
        />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="الاسم الكامل">
          <input value={values.fullName} dir="auto" disabled={disabled} onChange={(event) => set("fullName")(event.target.value)} placeholder="كما في الجواز" className={adminInputClass} />
        </Labeled>
        <Labeled label="الهاتف">
          <input
            value={values.phone}
            dir="ltr"
            inputMode="tel"
            disabled={disabled}
            onChange={(event) => set("phone")(event.target.value)}
            placeholder="+20 10…"
            className={cn(adminInputClass, "font-mono")}
          />
        </Labeled>
      </div>
      <Labeled label="الدور" hint={roleHint ?? ROLE_DESCRIPTIONS[values.role]}>
        <select
          value={values.role}
          disabled={disabled || roleDisabled}
          onChange={(event) => set("role")(event.target.value)}
          className={adminSelectClass}
        >
          {(roleDisabled && lockedRole ? [lockedRole] : roles).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </Labeled>
    </div>
  );
}

function SheetFooter({ status, children }: { status: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 text-sm">{status}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function UserEditorSheet({
  open,
  onClose,
  locale,
  user,
  access,
  onDeleted,
  showProfileLink = true,
  showDanger = true,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
  user: PeopleUser;
  access: UserAccess;
  onDeleted?: (email: string) => void;
  showProfileLink?: boolean;
  showDanger?: boolean;
}) {
  const guards = userGuards(user, access);
  const [baseline, setBaseline] = useState(() => toValues(user));
  const [values, setValues] = useState(baseline);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const invalid = !emailPattern.test(values.email.trim());

  const save = () => {
    if (!dirty || pending || !guards.canEdit) return;
    if (invalid) {
      setError("البريد غير صالح.");
      return;
    }
    start(async () => {
      setError(null);
      setSaved(false);
      try {
        const result = await adminUpdateUser(locale, user.id, values);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setBaseline(values);
        setSaved(true);
      } catch {
        setError("تعذر حفظ التغييرات. حاول مرة أخرى.");
      }
    });
  };
  useEditorKeys(save, open && dirty);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="تعديل الحساب"
      title={user.fullName || user.email}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <RoleBadge role={user.role} />
          {user.banned && !user.anonymized ? <span className="text-xs text-rose-300">محظور</span> : null}
          <span className="text-xs">
            انضم <span dir="ltr">{shortDate(user.createdAt)}</span>
          </span>
          {showProfileLink ? (
            <Link href={href(`/admin/users/${user.id}`, locale)} className="text-xs text-primary hover:underline">
              فتح الملف الكامل
            </Link>
          ) : null}
        </span>
      }
      footer={
        <SheetFooter
          status={
            pending ? (
              <span className="text-muted-foreground">جارٍ الحفظ…</span>
            ) : error ? (
              <span className="text-rose-300">{error}</span>
            ) : dirty ? (
              <span className="text-primary">تغييرات غير محفوظة</span>
            ) : saved ? (
              <span className="text-emerald-300">حُفظت التغييرات.</span>
            ) : (
              <span className="text-muted-foreground">لا توجد تغييرات.</span>
            )
          }
        >
          <button type="button" disabled={!dirty || pending} onClick={() => setValues(baseline)} className={cn(adminGhostClass, "text-muted-foreground")}>
            تجاهل
          </button>
          <button type="button" disabled={!dirty || pending || invalid || !guards.canEdit} onClick={save} className={adminPrimaryClass}>
            حفظ
          </button>
        </SheetFooter>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="space-y-6"
      >
        {!guards.canEdit ? <AdminNotice tone="warning">{guards.reason ?? "ليس لديك صلاحية تعديل الحسابات."}</AdminNotice> : null}
        <UserFields
          values={values}
          onChange={(next) => {
            setValues(next);
            setSaved(false);
          }}
          disabled={!guards.canEdit || pending}
          roleDisabled={!guards.canRole}
          lockedRole={baseline.role}
          roles={roleOptions(baseline.role, access.assignable)}
          roleHint={!guards.canRole && guards.canEdit ? (guards.self ? "لا يمكنك تغيير دور حسابك." : "تغيير الدور غير متاح لهذا الحساب.") : undefined}
          autoFocus
        />
        <button type="submit" className="sr-only" tabIndex={-1}>
          حفظ
        </button>
        <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-background/40 p-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">الطلبات</dt>
            <dd className="mt-0.5 font-mono tabular-nums">{user.applicationCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">مدفوعات مسجّلة</dt>
            <dd className="mt-0.5 font-mono tabular-nums">{user.paidPayments}</dd>
          </div>
        </dl>
      </form>
      {showDanger ? (
        <div className="mt-6">
          <UserDangerZone locale={locale} user={user} access={access} onDeleted={onDeleted} />
        </div>
      ) : null}
    </Sheet>
  );
}

export function UserDangerZone({
  locale,
  user,
  access,
  onDeleted,
}: {
  locale: string;
  user: PeopleUser;
  access: UserAccess;
  onDeleted?: (email: string) => void;
}) {
  const guards = userGuards(user, access);
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [notice]);

  const run = (task: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string, after?: () => void) =>
    start(async () => {
      setNotice(null);
      try {
        const result = await task();
        if (!result.ok) {
          setNotice({ tone: "danger", text: result.error });
          return;
        }
        setNotice({ tone: "success", text: success });
        after?.();
      } catch {
        setNotice({ tone: "danger", text: "تعذر تنفيذ الإجراء. حاول مرة أخرى." });
      }
    });

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium text-rose-300/90">منطقة الخطر</h3>
      <div className="divide-y divide-rose-500/15 overflow-hidden rounded-lg border border-rose-500/25">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{user.banned ? "إلغاء الحظر" : "حظر الحساب"}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {user.banned ? "يعود الحساب لتسجيل الدخول ومتابعة طلباته." : "يمنع تسجيل الدخول فوراً، وتبقى الطلبات والمدفوعات كما هي."}
            </p>
          </div>
          <ConfirmButton
            disabled={!guards.canBan || pending}
            confirmLabel={user.banned ? "تأكيد إلغاء الحظر" : "تأكيد الحظر"}
            onConfirm={() =>
              run(() => adminSetUserBanned(locale, user.id, !user.banned), user.banned ? "أُلغي الحظر عن الحساب." : "حُظر الحساب ولن يتمكن من تسجيل الدخول.")
            }
          >
            {user.banned ? "إلغاء الحظر" : "حظر"}
          </ConfirmButton>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">حذف الحساب</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">يُخفي البريد والاسم والهاتف ويمنع الدخول نهائياً. الطلبات تبقى في السجلات بلا مسؤول.</p>
            {user.paidPayments > 0 && guards.canDelete ? (
              <p className="mt-1.5 text-xs text-amber-300">
                لهذا الحساب {user.paidPayments} دفعة مسجّلة، لذلك سيُرفض الحذف. استخدم الحظر بدلاً منه.
              </p>
            ) : null}
          </div>
          <ConfirmButton
            disabled={!guards.canDelete || pending}
            confirmLabel="تأكيد الحذف"
            onConfirm={() => run(() => adminDeleteUser(locale, user.id), "حُذف الحساب وأُخفيت بياناته.", () => onDeleted?.(user.email))}
          >
            حذف
          </ConfirmButton>
        </div>
      </div>
      {guards.reason ? <p className="text-xs text-muted-foreground">{guards.reason}</p> : null}
      {pending ? <p className="text-xs text-muted-foreground">جارٍ التنفيذ…</p> : null}
      {notice ? (
        <div ref={noticeRef}>
          <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice>
        </div>
      ) : null}
    </section>
  );
}

export function CreateUserSheet({
  open,
  onClose,
  locale,
  assignable,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
  assignable: AdminRole[];
  onCreated: (email: string) => void;
}) {
  const roles = assignable.length ? assignable : (["user"] as AdminRole[]);
  const empty: Values = { email: "", fullName: "", phone: "", role: roles.includes("user") ? "user" : roles[roles.length - 1]! };
  const [values, setValues] = useState(empty);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const invalid = !emailPattern.test(values.email.trim());

  const submit = () => {
    if (pending) return;
    if (invalid) {
      setError("اكتب بريداً صالحاً.");
      return;
    }
    start(async () => {
      setError(null);
      try {
        const result = await adminCreateUser(locale, values);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onCreated(values.email.trim().toLowerCase());
        setValues(empty);
        onClose();
      } catch {
        setError("تعذر إنشاء الحساب. حاول مرة أخرى.");
      }
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="حساب جديد"
      title="إضافة مستخدم"
      description="يُنشأ الحساب مباشرة، ويدخل صاحبه برمز يصل إلى بريده."
      footer={
        <SheetFooter status={pending ? <span className="text-muted-foreground">جارٍ الإنشاء…</span> : error ? <span className="text-rose-300">{error}</span> : null}>
          <button type="button" onClick={onClose} className={cn(adminGhostClass, "text-muted-foreground")}>
            إلغاء
          </button>
          <button type="button" disabled={pending || invalid} onClick={submit} className={adminPrimaryClass}>
            إنشاء الحساب
          </button>
        </SheetFooter>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-dashed p-3">
          <Avatar name={values.fullName} email={values.email || "?"} tone="primary" />
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{values.fullName || "اسم الحساب"}</p>
            <p dir="ltr" className="truncate font-mono text-xs text-muted-foreground">
              {values.email || "name@example.com"}
            </p>
          </div>
        </div>
        <UserFields values={values} onChange={setValues} disabled={pending} roles={roles} autoFocus />
        <button type="submit" className="sr-only" tabIndex={-1}>
          إنشاء
        </button>
      </form>
    </Sheet>
  );
}

/** Edit button plus danger zone, for the user detail page. */
export function UserProfileActions({ locale, user, access }: { locale: string; user: PeopleUser; access: UserAccess }) {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState<string | null>(null);
  const guards = userGuards(user, access);
  return (
    <div className="space-y-4">
      {deleted ? <AdminNotice tone="success">حُذف الحساب {deleted} وأُخفيت بياناته.</AdminNotice> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!guards.canEdit} onClick={() => setOpen(true)} className={adminPrimaryClass}>
          تعديل البيانات
        </button>
        {!user.anonymized ? (
          <a href={`mailto:${user.email}`} className={adminGhostClass}>
            مراسلة بالبريد
          </a>
        ) : null}
        <Link href={href(`/admin/messages?q=${encodeURIComponent(user.email)}`, locale)} className={adminGhostClass}>
          رسائله
        </Link>
      </div>
      <UserDangerZone locale={locale} user={user} access={access} onDeleted={setDeleted} />
      {open ? (
        <UserEditorSheet
          key={`${user.id}-${user.email}-${user.role}`}
          open
          onClose={() => setOpen(false)}
          locale={locale}
          user={user}
          access={access}
          showProfileLink={false}
          showDanger={false}
          onDeleted={(email) => {
            setDeleted(email);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
