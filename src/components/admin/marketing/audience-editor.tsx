"use client";

import { adminInputClass, adminSelectClass } from "@/components/admin/chrome";
import type { AudienceFilter, YesNo } from "@/lib/marketing/audience";
import { visaTypeChoices } from "@/lib/marketing/labels";
import { cn } from "@/lib/utils";

export type AudienceOptions = {
  lists: { id: string; name: string; contacts: number }[];
  destinations: { id: string; name: string }[];
  nationalities: { code: string; name: string }[];
};

function YesNoSelect({ label, value, onChange, yes, no, disabled }: { label: string; value: YesNo; onChange: (value: YesNo) => void; yes: string; no: string; disabled?: boolean }) {
  return (
    <label className="block text-sm">
      {label}
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value as YesNo)} className={adminSelectClass}>
        <option value="any">الكل</option>
        <option value="yes">{yes}</option>
        <option value="no">{no}</option>
      </select>
    </label>
  );
}

export function AudienceEditor({ filter, onChange, options, disabled }: { filter: AudienceFilter; onChange: (next: AudienceFilter) => void; options: AudienceOptions; disabled?: boolean }) {
  const customers = filter.source !== "imported";
  const set = <K extends keyof AudienceFilter>(key: K, value: AudienceFilter[K]) => onChange({ ...filter, [key]: value });
  const off = disabled || !customers;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          القائمة
          <select disabled={disabled} value={filter.source} onChange={(event) => set("source", event.target.value as AudienceFilter["source"])} className={adminSelectClass}>
            <option value="customers">عملاء الموقع</option>
            <option value="imported">الجهات المستوردة</option>
            <option value="both">الاثنان معاً</option>
          </select>
        </label>
        <label className="block text-sm">
          بحث
          <input disabled={disabled} value={filter.query} onChange={(event) => set("query", event.target.value)} placeholder="اسم أو بريد أو هاتف" className={adminInputClass} />
        </label>
      </div>
      {filter.source !== "customers" ? (
        <fieldset className="text-sm">
          <legend>قوائم الجهات {filter.listIds.length ? "" : "· كل القوائم"}</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {options.lists.length === 0 ? <span className="text-xs text-muted-foreground">لا توجد قوائم بعد.</span> : null}
            {options.lists.map((list) => {
              const active = filter.listIds.includes(list.id);
              return (
                <button
                  key={list.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => set("listIds", active ? filter.listIds.filter((id) => id !== list.id) : [...filter.listIds, list.id])}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", active ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground")}
                >
                  {list.name} · {list.contacts}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", !customers && "opacity-50")}>
        <label className="block text-sm">
          نوع التأشيرة المشتراة
          <select disabled={off} value={filter.visaType ?? ""} onChange={(event) => set("visaType", event.target.value || null)} className={adminSelectClass}>
            <option value="">أي نوع</option>
            {visaTypeChoices.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          الجنس
          <select disabled={off} value={filter.sex ?? ""} onChange={(event) => set("sex", (event.target.value || null) as AudienceFilter["sex"])} className={adminSelectClass}>
            <option value="">أي جنس</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
            <option value="other">آخر</option>
          </select>
        </label>
        <label className="block text-sm">
          عدد الشراء
          <select disabled={off} value={filter.purchases} onChange={(event) => set("purchases", event.target.value as AudienceFilter["purchases"])} className={adminSelectClass}>
            <option value="any">أي عدد</option>
            <option value="none">لم يشترِ</option>
            <option value="once">مرة واحدة</option>
            <option value="repeat">متكرر، مرتين أو أكثر</option>
            <option value="min">حد أدنى</option>
          </select>
        </label>
        {filter.purchases === "min" ? (
          <label className="block text-sm">
            على الأقل
            <input type="number" min={1} dir="ltr" disabled={off} value={filter.minPurchases ?? 2} onChange={(event) => set("minPurchases", Number(event.target.value))} className={adminInputClass} />
          </label>
        ) : null}
        <label className="block text-sm">
          آخر شراء
          <select disabled={off} value={filter.lastPurchase} onChange={(event) => set("lastPurchase", event.target.value as AudienceFilter["lastPurchase"])} className={adminSelectClass}>
            <option value="any">أي وقت</option>
            <option value="within">خلال آخر…</option>
            <option value="before">لم يشترِ منذ…</option>
          </select>
        </label>
        {filter.lastPurchase !== "any" ? (
          <label className="block text-sm">
            أيام
            <input type="number" min={1} dir="ltr" disabled={off} value={filter.lastPurchaseDays ?? 90} onChange={(event) => set("lastPurchaseDays", Number(event.target.value))} className={adminInputClass} />
          </label>
        ) : null}
        <label className="block text-sm">
          إجمالي ما دفعه على الأقل
          <input type="number" min={0} dir="ltr" disabled={off} placeholder="بلا حد" value={filter.minSpent ?? ""} onChange={(event) => set("minSpent", event.target.value ? Number(event.target.value) : null)} className={adminInputClass} />
        </label>
        <label className="block text-sm">
          الوجهة المشتراة
          <select disabled={off} value={filter.destinationId ?? ""} onChange={(event) => set("destinationId", event.target.value || null)} className={adminSelectClass}>
            <option value="">أي وجهة</option>
            {options.destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          الجنسية
          <select disabled={off} value={filter.nationality ?? ""} onChange={(event) => set("nationality", event.target.value || null)} className={adminSelectClass}>
            <option value="">أي جنسية</option>
            {options.nationalities.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          لغة التصفح
          <select disabled={off} value={filter.locale ?? ""} onChange={(event) => set("locale", (event.target.value || null) as AudienceFilter["locale"])} className={adminSelectClass}>
            <option value="">أي لغة</option>
            <option value="ar">العربية</option>
            <option value="en">الإنجليزية</option>
          </select>
        </label>
        <label className="block text-sm">
          سجّل من
          <input type="date" dir="ltr" disabled={off} value={filter.joinedFrom ?? ""} onChange={(event) => set("joinedFrom", event.target.value || null)} className={adminInputClass} />
        </label>
        <label className="block text-sm">
          سجّل حتى
          <input type="date" dir="ltr" disabled={off} value={filter.joinedTo ?? ""} onChange={(event) => set("joinedTo", event.target.value || null)} className={adminInputClass} />
        </label>
        <YesNoSelect label="طلب لم يُدفع" disabled={off} value={filter.hasUnpaid} onChange={(value) => set("hasUnpaid", value)} yes="لديه طلب مفتوح" no="ليس لديه" />
        <YesNoSelect label="رقم الهاتف" disabled={off} value={filter.hasPhone} onChange={(value) => set("hasPhone", value)} yes="لديه هاتف" no="بلا هاتف" />
        <YesNoSelect label="استخدم كوبوناً" disabled={off} value={filter.usedCoupon} onChange={(value) => set("usedCoupon", value)} yes="نعم" no="لا" />
        <YesNoSelect label="جاء بإحالة" disabled={off} value={filter.referred} onChange={(value) => set("referred", value)} yes="نعم" no="لا" />
      </div>
      {filter.source === "both" ? <p className="text-xs text-muted-foreground">الفلاتر تخص عملاء الموقع. الجهات المستوردة تُضاف حسب القوائم والبحث.</p> : null}
      {customers ? <p className="text-xs text-muted-foreground">حسابات الموظفين والمحظورون لا يدخلون. من لا جنس له يظهر فقط عند «أي جنس».</p> : null}
    </div>
  );
}
