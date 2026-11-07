"use client";

import { useState, useTransition } from "react";
import { promoteStaffByEmail } from "@/app/actions/staff";
import { AdminNotice, Labeled, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import { Modal } from "@/components/admin/people/overlay";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac-constants";
import type { AdminRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEFAULT_MAX, splitSpecialty } from "./staff-shared";

const STAFF_ROLES: AdminRole[] = ["operator", "support", "manager", "admin"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddStaffDialog({
  locale,
  assignable,
  candidates,
  departments,
}: {
  locale: string;
  assignable: AdminRole[];
  candidates: string[];
  departments: string[];
}) {
  const roles = STAFF_ROLES.filter((role) => assignable.includes(role));
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>(roles[0] ?? "operator");
  const [department, setDepartment] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [maxApplications, setMaxApplications] = useState(String(DEFAULT_MAX));
  const normalized = email.trim().toLowerCase();
  const emailBad = normalized !== "" && !emailPattern.test(normalized);
  const known = candidates.includes(normalized);
  const max = Number(maxApplications);
  const maxBad = !Number.isInteger(max) || max < 1 || max > 500;

  const reset = () => {
    setEmail("");
    setDepartment("");
    setSpecialty("");
    setMaxApplications(String(DEFAULT_MAX));
    setError(null);
  };

  const submit = () => {
    if (pending) return;
    if (!emailPattern.test(normalized)) {
      setError("اكتب بريد حساب موجود.");
      return;
    }
    start(async () => {
      setError(null);
      try {
        const result = await promoteStaffByEmail(
          normalized,
          { role, department: department.trim() || undefined, specialty: splitSpecialty(specialty), maxApplications: maxBad ? DEFAULT_MAX : max },
          locale,
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
        setAdded(normalized);
        reset();
        setOpen(false);
      } catch {
        setError("تعذر إضافة الموظف. حاول مرة أخرى.");
      }
    });
  };

  return (
    <>
      {added ? (
        <span className="text-xs text-emerald-300">
          أُضيف <span dir="ltr" className="font-mono">{added}</span> إلى الفريق.
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setAdded(null);
          setOpen(true);
        }}
        disabled={!roles.length}
        className={adminPrimaryClass}
      >
        إضافة موظف
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة موظف"
        description="رقِّ حساباً موجوداً إلى فريق العمل. يجب أن يكون صاحبه قد سجّل الدخول مرة واحدة على الأقل."
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className={cn(adminGhostClass, "text-muted-foreground")}>
              إلغاء
            </button>
            <button type="button" onClick={submit} disabled={pending || !normalized || emailBad || maxBad} className={adminPrimaryClass}>
              {pending ? "جارٍ الإضافة…" : "إضافة إلى الفريق"}
            </button>
          </>
        }
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Labeled
            label="بريد الحساب"
            hint={
              emailBad ? (
                <span className="text-rose-400">البريد غير صالح.</span>
              ) : normalized && known ? (
                <span className="text-emerald-300">حساب موجود وجاهز للترقية.</span>
              ) : normalized ? (
                <span className="text-amber-300">لا نعرف حساب عميل بهذا البريد؛ سيتحقق الخادم عند الإضافة.</span>
              ) : (
                "ابدأ الكتابة لتظهر الحسابات المسجّلة."
              )
            }
          >
            <input
              type="email"
              dir="ltr"
              autoFocus
              list="staff-candidates"
              value={email}
              disabled={pending}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className={cn(adminInputClass, "font-mono", emailBad && "border-rose-500/70")}
            />
            <datalist id="staff-candidates">
              {candidates.map((candidate) => (
                <option key={candidate} value={candidate} />
              ))}
            </datalist>
          </Labeled>

          <Labeled label="الدور" hint={ROLE_DESCRIPTIONS[role]}>
            <select value={role} disabled={pending} onChange={(event) => setRole(event.target.value as AdminRole)} className={adminSelectClass}>
              {roles.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </Labeled>

          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="القسم">
              <input
                value={department}
                list="staff-add-departments"
                disabled={pending}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="مثال: معالجة الطلبات"
                className={adminInputClass}
              />
              <datalist id="staff-add-departments">
                {departments.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </Labeled>
            <Labeled label="الحد الأقصى للملفات" hint={maxBad ? <span className="text-rose-400">رقم بين 1 و500.</span> : undefined}>
              <input
                type="number"
                min={1}
                max={500}
                inputMode="numeric"
                value={maxApplications}
                disabled={pending}
                onChange={(event) => setMaxApplications(event.target.value)}
                className={cn(adminInputClass, "font-mono tabular-nums", maxBad && "border-rose-500/70")}
              />
            </Labeled>
          </div>

          <Labeled label="التخصص" hint="اختياري. افصل بفاصلة.">
            <input value={specialty} dir="ltr" disabled={pending} onChange={(event) => setSpecialty(event.target.value)} placeholder="schengen, asia" className={cn(adminInputClass, "font-mono")} />
          </Labeled>

          {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
          <button type="submit" className="sr-only" tabIndex={-1}>
            إضافة
          </button>
        </form>
      </Modal>
    </>
  );
}
