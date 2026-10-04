"use client";

import { useRef, useState, useTransition } from "react";
import { adminCreateUser, adminDeleteUser, adminUpdateUser } from "@/app/actions/admin";
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminPage,
  adminDangerClass,
  adminInputClass,
  adminPrimaryClass,
} from "@/components/admin/chrome";
import type { AccountRow } from "@/lib/data/users";
import { formatAt } from "@/lib/visa";

function fields(fd: FormData) {
  return {
    email: String(fd.get("email") ?? ""),
    fullName: String(fd.get("fullName") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    role: String(fd.get("role")) === "admin" ? ("admin" as const) : ("user" as const),
  };
}

export function UserTable({ locale, users, currentUserId }: { locale: string; users: AccountRow[]; currentUserId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const createRef = useRef<HTMLFormElement>(null);
  const needle = query.trim().toLowerCase();
  const shown = users.filter((user) =>
    `${user.email} ${user.fullName ?? ""} ${user.phone ?? ""} ${user.role}`.toLowerCase().includes(needle),
  );

  return (
    <AdminPage
      title="المستخدمون"
      description="أضف حسابًا، وعدّل البريد والاسم والهاتف والدور، أو احذف الحساب. الحذف يزيل طلبات ذلك الحساب. لا يمكن حذف حسابك أو آخر مدير."
    >
      {error && <AdminError>{error}</AdminError>}
      <AdminCard>
        <form
          ref={createRef}
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"
          action={(fd) =>
            start(async () => {
              setError(null);
              const result = await adminCreateUser(locale, fields(fd));
              if (!result.ok) setError(result.error);
              else createRef.current?.reset();
            })
          }
        >
          <input required name="email" type="email" placeholder="البريد" className={adminInputClass} />
          <input name="fullName" placeholder="الاسم" className={adminInputClass} />
          <input name="phone" placeholder="الهاتف" className={adminInputClass} />
          <select name="role" defaultValue="user" className={adminInputClass}>
            <option value="user">مستخدم</option>
            <option value="admin">مدير</option>
          </select>
          <button disabled={pending} className={adminPrimaryClass}>
            إضافة مستخدم
          </button>
        </form>
      </AdminCard>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="بحث بالبريد أو الاسم أو الهاتف"
        className={`${adminInputClass} mt-4`}
      />

      {shown.length === 0 ? (
        <div className="mt-4">
          <AdminEmpty>{users.length === 0 ? "لا يوجد مستخدمون بعد." : "لا توجد نتائج مطابقة."}</AdminEmpty>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((user) => (
            <AdminCard key={user.id}>
              <form
                className="grid gap-2 lg:grid-cols-6"
                action={(fd) =>
                  start(async () => {
                    setError(null);
                    const result = await adminUpdateUser(locale, user.id, fields(fd));
                    if (!result.ok) setError(result.error);
                  })
                }
              >
                <input required name="email" type="email" defaultValue={user.email} className={adminInputClass} />
                <input name="fullName" defaultValue={user.fullName ?? ""} placeholder="الاسم" className={adminInputClass} />
                <input name="phone" defaultValue={user.phone ?? ""} placeholder="الهاتف" className={adminInputClass} />
                <select name="role" defaultValue={user.role} className={adminInputClass}>
                  <option value="user">مستخدم</option>
                  <option value="admin">مدير</option>
                </select>
                <button disabled={pending} className={adminPrimaryClass}>
                  حفظ
                </button>
                <button
                  type="button"
                  disabled={pending || user.id === currentUserId}
                  className={adminDangerClass}
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      const result = await adminDeleteUser(locale, user.id);
                      if (!result.ok) setError(result.error);
                    })
                  }
                >
                  {user.id === currentUserId ? "حسابك" : "حذف"}
                </button>
              </form>
              <p className="mt-2 text-xs text-muted-ink">
                {user.applicationCount} طلب · منذ {formatAt(user.createdAt)}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
