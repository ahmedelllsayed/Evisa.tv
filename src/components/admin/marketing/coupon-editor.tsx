"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteCoupon, adminDuplicateCoupon, adminSaveCoupon, adminSetCouponActive } from "@/app/actions/marketing";
import { AdminError, Pill, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass } from "@/components/admin/chrome";
import type { CouponDraft, CouponRecord } from "@/lib/coupon-math";
import { href } from "@/lib/href";
import { money, visaTypeChoices } from "@/lib/marketing/labels";
import { couponLink } from "@/lib/marketing/links";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

const empty: CouponDraft = {
  code: "",
  name: null,
  kind: "percent",
  value: 10,
  appliesTo: "service",
  destinationIds: [],
  visaTypes: [],
  minTotal: null,
  maxDiscount: null,
  perCustomer: 1,
  firstOrderOnly: false,
  segmentId: null,
  active: true,
  startsOn: null,
  endsOn: null,
  maxUses: null,
};

function fromCoupon(coupon: CouponRecord): CouponDraft {
  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    kind: coupon.kind,
    value: coupon.value,
    appliesTo: coupon.appliesTo,
    destinationIds: coupon.destinationIds,
    visaTypes: coupon.visaTypes,
    minTotal: coupon.minTotal,
    maxDiscount: coupon.maxDiscount,
    perCustomer: coupon.perCustomer,
    firstOrderOnly: coupon.firstOrderOnly,
    segmentId: coupon.segmentId,
    active: coupon.active,
    startsOn: coupon.startsAt?.slice(0, 10) ?? null,
    endsOn: coupon.endsAt?.slice(0, 10) ?? null,
    maxUses: coupon.maxUses,
  };
}

function rules(coupon: CouponRecord, destinations: Map<string, string>) {
  const parts: string[] = [];
  parts.push(coupon.destinationIds.length ? coupon.destinationIds.map((id) => destinations.get(id) ?? "وجهة").join("، ") : "كل الدول");
  if (coupon.visaTypes.length) parts.push(coupon.visaTypes.join("، "));
  if (coupon.minTotal) parts.push(`من ${money(coupon.minTotal)}`);
  if (coupon.firstOrderOnly) parts.push("أول طلب");
  if (coupon.perCustomer > 1) parts.push(`${coupon.perCustomer} مرات للعميل`);
  if (coupon.segmentName) parts.push(`شريحة ${coupon.segmentName}`);
  return parts.join(" · ");
}

export function CouponEditor({
  locale,
  coupons,
  destinations,
  segments,
  canEdit,
}: {
  locale: string;
  coupons: CouponRecord[];
  destinations: { id: string; name: string }[];
  segments: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<CouponDraft>(empty);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const destinationNames = useMemo(() => new Map(destinations.map((item) => [item.id, item.name])), [destinations]);
  const shown = coupons.filter((coupon) => !query.trim() || `${coupon.code} ${coupon.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const places = destinations.filter((item) => !placeQuery.trim() || item.name.toLowerCase().includes(placeQuery.trim().toLowerCase()));

  function set<K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggle(key: "destinationIds" | "visaTypes", id: string) {
    setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id] }));
  }

  function run(task: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? "تعذر الحفظ.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function save() {
    run(
      () =>
        adminSaveCoupon(locale, {
          ...draft,
          value: Number(draft.value),
          maxUses: draft.maxUses ? Number(draft.maxUses) : null,
          minTotal: draft.minTotal ? Number(draft.minTotal) : null,
          maxDiscount: draft.maxDiscount ? Number(draft.maxDiscount) : null,
          perCustomer: Number(draft.perCustomer) || 1,
        }),
      () => setDraft(empty),
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث برمز أو اسم" className={cn(adminInputClass, "mt-0 max-w-xs")} />
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">الرمز</th>
                <th className="px-3 py-2 text-start font-medium">الخصم</th>
                <th className="px-3 py-2 text-start font-medium">الاستخدام</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
                <th className="px-3 py-2 text-end font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">لا توجد كوبونات.</td>
                </tr>
              ) : null}
              {shown.map((coupon) => (
                <tr key={coupon.id} className="border-t align-top">
                  <td className="px-3 py-3">
                    <Link href={href(`/admin/marketing/coupons/${coupon.id}`, locale)} className="font-mono font-semibold hover:text-primary" dir="ltr">
                      {coupon.code}
                    </Link>
                    {coupon.name ? <p className="text-xs">{coupon.name}</p> : null}
                    <p className="text-xs text-muted-foreground">{rules(coupon, destinationNames)}</p>
                  </td>
                  <td className="px-3 py-3">
                    {coupon.kind === "percent" ? `${coupon.value}%` : money(coupon.value)}
                    <p className="text-xs text-muted-foreground">
                      {coupon.appliesTo === "service" ? "رسم الخدمة" : "الإجمالي"}
                      {coupon.maxDiscount ? ` · حتى ${money(coupon.maxDiscount)}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono">{coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}</span>
                    <p className="text-xs text-muted-foreground">خصم {money(coupon.discountTotal)}</p>
                    {coupon.codeCount ? <p className="text-xs text-muted-foreground">رموز فردية {coupon.codeUsed} / {coupon.codeCount}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={!canEdit || pending}
                      onClick={() => run(() => adminSetCouponActive(locale, coupon.id, !coupon.active))}
                    >
                      <Pill tone={coupon.active ? "success" : "neutral"} dot>{coupon.active ? "مفعّل" : "متوقف"}</Pill>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <CopyButton value={couponLink(coupon.code)} label="الرابط" />
                      <button type="button" disabled={!canEdit || pending} className={cn(adminGhostClass, "h-8 px-3 text-xs")} onClick={() => { setError(null); setDraft(fromCoupon(coupon)); }}>
                        تعديل
                      </button>
                      <button type="button" disabled={!canEdit || pending} className={cn(adminGhostClass, "h-8 px-3 text-xs")} onClick={() => run(() => adminDuplicateCoupon(locale, coupon.id))}>
                        نسخ
                      </button>
                      <button
                        type="button"
                        disabled={!canEdit || pending}
                        className={cn(adminDangerClass, "h-8 px-3 text-xs")}
                        onClick={() => {
                          if (window.confirm(`حذف الكوبون ${coupon.code}؟ الطلبات المدفوعة تحتفظ بمبالغها.`)) {
                            run(() => adminDeleteCoupon(locale, coupon.id), () => setDraft((current) => (current.id === coupon.id ? empty : current)));
                          }
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          {draft.id ? <button type="button" className="text-xs text-muted-foreground" onClick={() => setDraft(empty)}>جديد</button> : null}
        </div>
        {error ? <AdminError>{error}</AdminError> : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            الرمز
            <input dir="ltr" value={draft.code} disabled={!canEdit} onChange={(event) => set("code", event.target.value.toUpperCase())} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            اسم داخلي
            <input value={draft.name ?? ""} disabled={!canEdit} onChange={(event) => set("name", event.target.value || null)} className={adminInputClass} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-sm">
            النوع
            <select value={draft.kind} disabled={!canEdit} onChange={(event) => set("kind", event.target.value as CouponDraft["kind"])} className={adminSelectClass}>
              <option value="percent">نسبة</option>
              <option value="fixed">مبلغ</option>
            </select>
          </label>
          <label className="block text-sm">
            القيمة
            <input type="number" min="1" dir="ltr" value={draft.value} disabled={!canEdit} onChange={(event) => set("value", Number(event.target.value))} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            يخصم من
            <select value={draft.appliesTo} disabled={!canEdit} onChange={(event) => set("appliesTo", event.target.value as CouponDraft["appliesTo"])} className={adminSelectClass}>
              <option value="service">رسم الخدمة</option>
              <option value="total">الإجمالي</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            حد أدنى للطلب
            <input type="number" min="0" dir="ltr" placeholder="بلا حد" value={draft.minTotal ?? ""} disabled={!canEdit} onChange={(event) => set("minTotal", event.target.value ? Number(event.target.value) : null)} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            سقف الخصم
            <input
              type="number"
              min="0"
              dir="ltr"
              placeholder={draft.kind === "percent" ? "بلا سقف" : "للنسبة فقط"}
              value={draft.maxDiscount ?? ""}
              disabled={!canEdit || draft.kind !== "percent"}
              onChange={(event) => set("maxDiscount", event.target.value ? Number(event.target.value) : null)}
              className={adminInputClass}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            حد الاستخدام الكلي
            <input type="number" min="1" dir="ltr" placeholder="بلا حد" value={draft.maxUses ?? ""} disabled={!canEdit} onChange={(event) => set("maxUses", event.target.value ? Number(event.target.value) : null)} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            مرات لكل عميل
            <input type="number" min="1" max="100" dir="ltr" value={draft.perCustomer} disabled={!canEdit} onChange={(event) => set("perCustomer", Number(event.target.value) || 1)} className={adminInputClass} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            من
            <input type="date" dir="ltr" value={draft.startsOn ?? ""} disabled={!canEdit} onChange={(event) => set("startsOn", event.target.value || null)} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            إلى
            <input type="date" dir="ltr" value={draft.endsOn ?? ""} disabled={!canEdit} onChange={(event) => set("endsOn", event.target.value || null)} className={adminInputClass} />
          </label>
        </div>
        <fieldset className="text-sm">
          <legend>أنواع التأشيرة</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {visaTypeChoices.map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={!canEdit}
                aria-pressed={draft.visaTypes.includes(id)}
                onClick={() => toggle("visaTypes", id)}
                className={cn("rounded-full border px-2.5 py-1 text-xs", draft.visaTypes.includes(id) ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">بدون اختيار يسري على كل الأنواع.</p>
        </fieldset>
        <fieldset className="text-sm">
          <legend>الوجهات {draft.destinationIds.length ? `(${draft.destinationIds.length})` : "· كل الدول"}</legend>
          <input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="ابحث عن دولة" className={adminInputClass} />
          <div className="mt-1.5 max-h-36 space-y-1 overflow-y-auto rounded-lg border p-2">
            {places.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-xs">
                <input type="checkbox" disabled={!canEdit} checked={draft.destinationIds.includes(item.id)} onChange={() => toggle("destinationIds", item.id)} />
                {item.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">
          شريحة العملاء
          <select value={draft.segmentId ?? ""} disabled={!canEdit} onChange={(event) => set("segmentId", event.target.value || null)} className={adminSelectClass}>
            <option value="">كل العملاء</option>
            {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.firstOrderOnly} disabled={!canEdit} onChange={(event) => set("firstOrderOnly", event.target.checked)} />
          أول طلب مدفوع فقط
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.active} disabled={!canEdit} onChange={(event) => set("active", event.target.checked)} />
          مفعّل
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">الاستخدام يُحتسب بعد نجاح الدفع. الرموز الفردية تُولَّد من صفحة الكوبون بعد حفظه.</p>
        <button type="submit" disabled={!canEdit || pending} className={adminPrimaryClass}>{pending ? "جارٍ الحفظ…" : "حفظ"}</button>
      </form>
    </div>
  );
}
