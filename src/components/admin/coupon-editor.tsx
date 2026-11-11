"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteCoupon, adminSaveCoupon, adminSetCouponActive } from "@/app/actions/admin";
import { AdminError, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import type { CouponDraft, CouponRecord } from "@/lib/coupon-math";
import { cn } from "@/lib/utils";

const empty: CouponDraft = {
  code: "",
  kind: "percent",
  value: 10,
  appliesTo: "service",
  destinationId: null,
  active: true,
  startsOn: null,
  endsOn: null,
  maxUses: null,
};

function fromCoupon(coupon: CouponRecord): CouponDraft {
  return {
    id: coupon.id,
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.value,
    appliesTo: coupon.appliesTo,
    destinationId: coupon.destinationId,
    active: coupon.active,
    startsOn: coupon.startsAt?.slice(0, 10) ?? null,
    endsOn: coupon.endsAt?.slice(0, 10) ?? null,
    maxUses: coupon.maxUses,
  };
}

export function CouponEditor({
  locale,
  coupons,
  destinations,
  canEdit,
}: {
  locale: string;
  coupons: CouponRecord[];
  destinations: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<CouponDraft>(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    start(async () => {
      const result = await adminSaveCoupon(locale, {
        ...draft,
        value: Number(draft.value),
        maxUses: draft.maxUses ? Number(draft.maxUses) : null,
        destinationId: draft.destinationId || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(empty);
      router.refresh();
    });
  }

  function remove(id: string, code: string) {
    if (!window.confirm(`حذف الكوبون ${code}؟`)) return;
    setError(null);
    start(async () => {
      const result = await adminDeleteCoupon(locale, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft((current) => (current.id === id ? empty : current));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-card text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-medium">الرمز</th>
              <th className="px-3 py-2 text-start font-medium">الخصم</th>
              <th className="px-3 py-2 text-start font-medium">على</th>
              <th className="px-3 py-2 text-start font-medium">الاستخدام</th>
              <th className="px-3 py-2 text-start font-medium">الحالة</th>
              <th className="px-3 py-2 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">لا توجد كوبونات.</td>
              </tr>
            ) : null}
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-t">
                <td className="px-3 py-3">
                  <button type="button" className="font-mono font-semibold" onClick={() => setDraft(fromCoupon(coupon))}>
                    {coupon.code}
                  </button>
                  <p className="text-xs text-muted-foreground">{coupon.destinationName ?? "كل الدول"}</p>
                </td>
                <td className="px-3 py-3">{coupon.kind === "percent" ? `${coupon.value}%` : `${coupon.value} ج.م`}</td>
                <td className="px-3 py-3">{coupon.appliesTo === "service" ? "رسم الخدمة" : "الإجمالي"}</td>
                <td className="px-3 py-3 font-mono">{coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    disabled={!canEdit || pending}
                    onClick={() =>
                      start(async () => {
                        await adminSetCouponActive(locale, coupon.id, !coupon.active);
                        router.refresh();
                      })
                    }
                    className={cn("text-xs font-medium", coupon.active ? "text-emerald-300" : "text-muted-foreground")}
                  >
                    {coupon.active ? "مفعّل" : "متوقف"}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" disabled={!canEdit || pending} className={adminGhostClass} onClick={() => { setError(null); setDraft(fromCoupon(coupon)); }}>
                      تعديل
                    </button>
                    <button type="button" disabled={!canEdit || pending} className={adminDangerClass} onClick={() => remove(coupon.id, coupon.code)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="space-y-3 rounded-xl border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{draft.id ? "تعديل الكوبون" : "كوبون جديد"}</h2>
          {draft.id ? (
            <button type="button" className="text-xs text-muted-foreground" onClick={() => setDraft(empty)}>جديد</button>
          ) : null}
        </div>
        {error ? <AdminError>{error}</AdminError> : null}
        <label className="block text-sm">
          الرمز
          <input dir="ltr" value={draft.code} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, code: event.target.value })} className={adminInputClass} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            النوع
            <select value={draft.kind} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, kind: event.target.value as CouponDraft["kind"] })} className={adminSelectClass}>
              <option value="percent">نسبة</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </label>
          <label className="block text-sm">
            القيمة
            <input type="number" min="1" dir="ltr" value={draft.value} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, value: Number(event.target.value) })} className={adminInputClass} />
          </label>
        </div>
        <label className="block text-sm">
          يخصم من
          <select value={draft.appliesTo} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, appliesTo: event.target.value as CouponDraft["appliesTo"] })} className={adminSelectClass}>
            <option value="service">رسم الخدمة فقط</option>
            <option value="total">الإجمالي كله</option>
          </select>
        </label>
        <label className="block text-sm">
          الدولة
          <select value={draft.destinationId ?? ""} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, destinationId: event.target.value || null })} className={adminSelectClass}>
            <option value="">كل الدول</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>{destination.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            من
            <input type="date" dir="ltr" value={draft.startsOn ?? ""} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, startsOn: event.target.value || null })} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            إلى
            <input type="date" dir="ltr" value={draft.endsOn ?? ""} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, endsOn: event.target.value || null })} className={adminInputClass} />
          </label>
        </div>
        <label className="block text-sm">
          حد الاستخدام
          <input type="number" min="1" dir="ltr" placeholder="بلا حد" value={draft.maxUses ?? ""} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, maxUses: event.target.value ? Number(event.target.value) : null })} className={adminInputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.active} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          مفعّل
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">كل عميل يستخدم الرمز مرة واحدة. الاستخدام يُحتسب بعد نجاح الدفع.</p>
        <div className="flex gap-2">
          <button type="submit" disabled={!canEdit || pending} className={adminPrimaryClass}>{pending ? "جارٍ الحفظ…" : "حفظ"}</button>
          {draft.id ? (
            <button
              type="button"
              disabled={!canEdit || pending}
              className={adminDangerClass}
              onClick={() => draft.id && remove(draft.id, draft.code)}
            >
              حذف
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
