"use client";

import { useState, useTransition } from "react";
import { removeStaffProfile, updateStaffProfile, updateUserRole } from "@/app/actions/staff";
import { AdminNotice, Bar, Labeled, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass, adminTextareaClass } from "@/components/admin/chrome";
import { ConfirmButton, Counter, useEditorKeys } from "@/components/admin/chrome-client";
import { Sheet } from "@/components/admin/people/overlay";
import { RoleBadge } from "@/components/admin/people/ui";
import { Toggle } from "@/components/admin/settings-fields";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, canManageUser } from "@/lib/rbac-constants";
import type { AdminRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEFAULT_MAX, loadTone, splitSpecialty, type StaffAccess, type StaffMember } from "./staff-shared";

type Values = {
  role: AdminRole;
  department: string;
  specialty: string;
  maxApplications: string;
  notes: string;
  active: boolean;
  hiredAt: string;
};

function toValues(member: StaffMember): Values {
  return {
    role: member.role,
    department: member.profile?.department ?? "",
    specialty: member.profile?.specialty.join(", ") ?? "",
    maxApplications: String(member.profile?.maxApplications ?? DEFAULT_MAX),
    notes: member.profile?.notes ?? "",
    active: member.profile?.active ?? true,
    hiredAt: member.profile?.hiredAt ?? "",
  };
}

export function StaffEditorSheet({
  locale,
  member,
  access,
  departments,
  onClose,
}: {
  locale: string;
  member: StaffMember;
  access: StaffAccess;
  departments: string[];
  onClose: () => void;
}) {
  const [baseline, setBaseline] = useState(() => toValues(member));
  const [values, setValues] = useState(baseline);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const self = member.id === access.currentUserId;
  const manageable = canManageUser(access.currentRole, member.role);
  const canRole = access.canChangeRole && manageable && !self;
  const staffRoles: AdminRole[] = access.assignable.filter((role) => role !== "user");
  const roles: AdminRole[] = staffRoles.includes(member.role) ? staffRoles : [member.role, ...staffRoles];
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const max = Number(values.maxApplications);
  const maxBad = !Number.isInteger(max) || max < 1 || max > 500;
  const tags = splitSpecialty(values.specialty);
  const set = <K extends keyof Values>(key: K) => (value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    if (!dirty || pending || maxBad || !access.canManage) return;
    start(async () => {
      setError(null);
      setSaved(false);
      try {
        const result = await updateStaffProfile(
          member.id,
          {
            department: values.department.trim() || null,
            specialty: tags,
            maxApplications: max,
            notes: values.notes.trim() || null,
            active: values.active,
            hiredAt: values.hiredAt || null,
          },
          locale,
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
        if (values.role !== baseline.role) {
          const roleResult = await updateUserRole(member.id, values.role, locale);
          if (!roleResult.success) {
            setBaseline({ ...values, role: baseline.role });
            setError(`حُفظ الملف، لكن تعذر تغيير الدور: ${roleResult.error}`);
            return;
          }
        }
        setBaseline(values);
        setSaved(true);
      } catch {
        setError("تعذر حفظ التغييرات. حاول مرة أخرى.");
      }
    });
  };
  useEditorKeys(save, dirty);

  const remove = () =>
    start(async () => {
      setError(null);
      const result = await removeStaffProfile(member.id, locale);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
    });

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow="تعديل الموظف"
      title={member.fullName || member.email}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <RoleBadge role={member.role} />
          <span dir="ltr" className="font-mono text-xs">
            {member.email}
          </span>
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm">
            {pending ? (
              <span className="text-muted-foreground">جارٍ الحفظ…</span>
            ) : error ? (
              <span className="text-rose-300">{error}</span>
            ) : dirty ? (
              <span className="text-primary">تغييرات غير محفوظة</span>
            ) : saved ? (
              <span className="text-emerald-300">حُفظت التغييرات.</span>
            ) : (
              <span className="text-muted-foreground">لا توجد تغييرات.</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!dirty || pending} onClick={() => setValues(baseline)} className={cn(adminGhostClass, "text-muted-foreground")}>
              تجاهل
            </button>
            <button type="button" disabled={!dirty || pending || maxBad || !access.canManage} onClick={save} className={adminPrimaryClass}>
              حفظ
            </button>
          </div>
        </div>
      }
    >
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Labeled
          label="الدور"
          hint={canRole ? ROLE_DESCRIPTIONS[values.role] : self ? "لا يمكنك تغيير دور حسابك." : "تغيير الدور غير متاح لهذا الحساب بصلاحيتك."}
        >
          <select value={values.role} disabled={!canRole || pending} onChange={(event) => set("role")(event.target.value as AdminRole)} className={adminSelectClass}>
            {(canRole ? roles : [member.role]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </Labeled>

        <div className="grid gap-5 sm:grid-cols-2">
          <Labeled label="القسم">
            <input
              value={values.department}
              list="staff-departments"
              disabled={pending}
              onChange={(event) => set("department")(event.target.value)}
              placeholder="مثال: معالجة الطلبات"
              className={adminInputClass}
            />
            <datalist id="staff-departments">
              {departments.map((department) => (
                <option key={department} value={department} />
              ))}
            </datalist>
          </Labeled>
          <Labeled label="تاريخ التعيين">
            <input type="date" value={values.hiredAt} disabled={pending} onChange={(event) => set("hiredAt")(event.target.value)} className={cn(adminInputClass, "font-mono [color-scheme:dark]")} />
          </Labeled>
        </div>

        <Labeled label="التخصص" hint="افصل بين التخصصات بفاصلة. يُستخدم في الإسناد التلقائي حسب نوع الطلب.">
          <input
            value={values.specialty}
            dir="ltr"
            disabled={pending}
            onChange={(event) => set("specialty")(event.target.value)}
            placeholder="schengen, asia"
            className={cn(adminInputClass, "font-mono")}
          />
          {tags.length ? (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} dir="auto" className="rounded border border-primary/30 bg-primary/5 px-1.5 py-px font-mono text-[11px] text-primary">
                  {tag}
                </span>
              ))}
            </span>
          ) : null}
        </Labeled>

        <Labeled
          label="الحد الأقصى للملفات المفتوحة"
          hint={maxBad ? <span className="text-rose-400">اكتب رقماً صحيحاً بين 1 و500.</span> : "عند الوصول إليه يتوقف الإسناد التلقائي لهذا الموظف."}
        >
          <input
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            value={values.maxApplications}
            disabled={pending}
            onChange={(event) => set("maxApplications")(event.target.value)}
            className={cn(adminInputClass, "font-mono tabular-nums", maxBad && "border-rose-500/70")}
          />
          {!maxBad ? (
            <span className="mt-2 block">
              <span className="mb-1 flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>مفتوح الآن {member.open}</span>
                <span>{max}</span>
              </span>
              <Bar value={member.open} max={max} tone={loadTone(member.open, max)} />
            </span>
          ) : null}
        </Labeled>

        <Labeled label="ملاحظات" hint={<Counter length={values.notes.length} max={1000} />}>
          <textarea
            value={values.notes}
            dir="auto"
            rows={3}
            disabled={pending}
            onChange={(event) => set("notes")(event.target.value)}
            placeholder="مواعيد العمل، اللغات، أو أي شيء يفيد الفريق."
            className={adminTextareaClass}
          />
        </Labeled>

        <Toggle
          name="active"
          label="متاح لاستلام الملفات"
          description="الموظف المعطّل يبقى بصلاحياته، لكنه لا يُسند إليه أي ملف تلقائياً."
          checked={values.active}
          onChange={set("active")}
          disabled={pending || member.banned}
        />
        <button type="submit" className="sr-only" tabIndex={-1}>
          حفظ
        </button>
      </form>

      <section className="mt-6 space-y-2">
        <h3 className="text-xs font-medium text-rose-300/90">منطقة الخطر</h3>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/25 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">إزالة من الفريق</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">يتحول الحساب إلى مستخدم عادي ويُحذف ملف الموظف. الملفات المُسندة إليه تبقى كما هي.</p>
          </div>
          <ConfirmButton onConfirm={remove} disabled={!access.canManage || self || !manageable || pending} confirmLabel="تأكيد الإزالة">
            إزالة
          </ConfirmButton>
        </div>
        {self ? <p className="text-xs text-muted-foreground">لا يمكنك إزالة حسابك من الفريق.</p> : !manageable ? <p className="text-xs text-muted-foreground">دور هذا الحساب مساوٍ لدورك أو أعلى منه.</p> : null}
      </section>
      {error ? (
        <div className="mt-4">
          <AdminNotice tone="danger">{error}</AdminNotice>
        </div>
      ) : null}
    </Sheet>
  );
}
