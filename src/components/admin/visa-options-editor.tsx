"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { DurationField, FeeSummary, PairedSelect, SpanField, money } from "@/components/admin/destination-fields";
import { adminInputClass } from "@/components/admin/chrome";
import { DocumentChecklist } from "@/components/admin/document-checklist";
import { entryOptions, withCurrent } from "@/lib/destination-fields";
import { href } from "@/lib/href";
import type { VisaOption, VisaType } from "@/lib/types";
import { governmentFeeCharged, processingLabel } from "@/lib/visa";
import { cn } from "@/lib/utils";

type Kind = "e-visa" | "eta" | "sticker";

type Draft = {
  key: string;
  label: string;
  labelAr: string;
  touched: boolean;
  kind: Kind;
  entry: string | null;
  govFee: string;
  serviceFee: string;
  expressOn: boolean;
  expressFee: string;
  customDocs: boolean;
  documents: string[];
  active: boolean;
  open: boolean;
  processingHours: number | null;
  expressHours: number | null;
  stay: string | null;
  stayAr: string | null;
  validity: string | null;
  validityAr: string | null;
};

function kindOf(option: VisaOption): Kind {
  if (option.embassyVisit || option.visaType === "sticker") return "sticker";
  if (option.visaType === "eta") return "eta";
  return "e-visa";
}

function fromOption(option: VisaOption, open: boolean): Draft {
  return {
    key: option.id,
    label: option.label,
    labelAr: option.labelAr ?? "",
    touched: true,
    kind: kindOf(option),
    entry: option.entry,
    govFee: String(option.govFee),
    serviceFee: String(option.serviceFee),
    expressOn: option.expressHours != null,
    expressFee: String(option.expressFee ?? 0),
    customDocs: Boolean(option.documents?.length),
    documents: option.documents ?? [],
    active: option.isActive,
    open,
    processingHours: option.processingHours,
    expressHours: option.expressHours,
    stay: option.stay,
    stayAr: option.stayAr,
    validity: option.validity,
    validityAr: option.validityAr,
  };
}

function blank(key: string): Draft {
  return {
    key,
    label: "Standard",
    labelAr: "عادية",
    touched: false,
    kind: "e-visa",
    entry: "Single",
    govFee: "0",
    serviceFee: "0",
    expressOn: false,
    expressFee: "0",
    customDocs: false,
    documents: [],
    active: true,
    open: true,
    processingHours: 96,
    expressHours: 48,
    stay: null,
    stayAr: null,
    validity: null,
    validityAr: null,
  };
}

function entryArabic(value: string | null) {
  return entryOptions.find((option) => option.value === value)?.ar ?? "";
}

function suggest(stay: string | null, entry: string | null, stayAr: string | null, entryAr: string | null) {
  return {
    label: [stay, entry].filter(Boolean).join(" · ") || "Standard",
    labelAr: [stayAr, entryAr].filter(Boolean).join(" · "),
  };
}

export function VisaOptionsEditor({
  locale,
  destinationSlug,
  options,
  counts,
}: {
  locale: string;
  destinationSlug: string;
  options: VisaOption[];
  counts: Record<string, number>;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    options.length ? options.map((option, index) => fromOption(option, index === 0)) : [blank("new-1")],
  );
  const [defaultKey, setDefaultKey] = useState(() => options.find((option) => option.isDefault)?.id ?? drafts[0]?.key ?? "new-1");
  const [seq, setSeq] = useState(2);

  function patch(key: string, change: (draft: Draft) => Draft) {
    setDrafts((list) => {
      let changed = false;
      const next = list.map((item) => {
        if (item.key !== key) return item;
        const updated = change(item);
        if (updated === item) return item;
        changed = true;
        return updated;
      });
      return changed ? next : list;
    });
  }

  function move(index: number, direction: -1 | 1) {
    setDrafts((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const next = list.slice();
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-ink">كل بطاقة نوع تأشيرة بسعره ومدته. النوع الافتراضي هو الذي يظهر في بطاقة الدولة على الصفحة الرئيسية.</p>
      {drafts.map((draft, index) => {
        const embassy = draft.kind === "sticker";
        const charged = governmentFeeCharged({
          govFee: Number(draft.govFee) || 0,
          visaType: (embassy ? "sticker" : draft.kind) as VisaType,
          embassyVisit: embassy,
        });
        const total = charged + (Number(draft.serviceFee) || 0);
        const prefix = `opt.${draft.key}`;
        return (
          <section key={draft.key} className="rounded-2xl border border-line">
            <input type="hidden" name="optionKey" value={draft.key} />
            <input type="hidden" name={`${prefix}.kind`} value={draft.kind} />
            <input type="hidden" name={`${prefix}.active`} value={draft.active ? "on" : ""} />
            <input type="hidden" name={`${prefix}.expressOn`} value={draft.expressOn ? "on" : ""} />
            <input type="hidden" name={`${prefix}.documentsMode`} value={draft.customDocs ? "custom" : "shared"} />
            <div className="flex flex-wrap items-center gap-2 p-4">
              <button type="button" onClick={() => patch(draft.key, (item) => ({ ...item, open: !item.open }))} className="min-w-0 flex-1 text-start">
                <span className="block truncate font-semibold text-ink">{draft.label || "نوع بدون اسم"}</span>
                <span className="mt-0.5 block text-xs text-muted-ink">
                  {money(total)} · {processingLabel(draft.processingHours, "ar-EG")}
                </span>
              </button>
              {draft.key === defaultKey ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand">افتراضي</span> : null}
              {!draft.active ? <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-ink">مخفي</span> : null}
              {counts[draft.key] ? (
                <Link href={href(`/admin/applications?destination=${destinationSlug}&option=${draft.key}`, locale)} className="text-xs font-medium text-brand">
                  {counts[draft.key]} طلب
                </Link>
              ) : null}
              <button type="button" aria-label="تحريك لأعلى" onClick={() => move(index, -1)} className="rounded-lg border border-line p-1.5">
                <ChevronUp className="size-4" />
              </button>
              <button type="button" aria-label="تحريك لأسفل" onClick={() => move(index, 1)} className="rounded-lg border border-line p-1.5">
                <ChevronDown className="size-4" />
              </button>
            </div>
            <div className={cn("space-y-4 border-t border-line p-4", draft.open ? "" : "hidden")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  الاسم بالإنجليزية
                  <input
                    name={`${prefix}.label`}
                    value={draft.label}
                    onChange={(event) => patch(draft.key, (item) => ({ ...item, label: event.target.value, touched: true }))}
                    className={adminInputClass}
                  />
                </label>
                <label className="text-sm">
                  الاسم بالعربية
                  <input
                    name={`${prefix}.labelAr`}
                    value={draft.labelAr}
                    onChange={(event) => patch(draft.key, (item) => ({ ...item, labelAr: event.target.value, touched: true }))}
                    className={adminInputClass}
                  />
                </label>
              </div>
              <label className="block text-sm">
                طريقة الإصدار والتحصيل
                <select
                  value={draft.kind}
                  onChange={(event) => patch(draft.key, (item) => ({ ...item, kind: event.target.value as Kind }))}
                  className={adminInputClass}
                >
                  <option value="e-visa">إلكترونية: الرسوم الحكومية + رسوم المعالجة</option>
                  <option value="eta">تصريح إلكتروني: الرسوم الحكومية + رسوم المعالجة</option>
                  <option value="sticker">ملصق سفارة: رسوم المعالجة فقط</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <SpanField
                  key={`${draft.key}-stay`}
                  label="مدة الإقامة"
                  name={`${prefix}.stay`}
                  nameAr={`${prefix}.stayAr`}
                  en={draft.stay}
                  ar={draft.stayAr}
                  onPhrase={(phrase) =>
                    patch(draft.key, (item) => {
                      const stay = phrase?.en || null;
                      const stayAr = phrase?.ar || null;
                      if (item.stay === stay && item.stayAr === stayAr && (item.touched || !phrase)) return item;
                      if (item.touched || !phrase) return { ...item, stay, stayAr };
                      const next = suggest(stay, item.entry, stayAr, entryArabic(item.entry));
                      return { ...item, stay, stayAr, label: next.label, labelAr: next.labelAr };
                    })
                  }
                />
                <SpanField
                  key={`${draft.key}-validity`}
                  label="صلاحية التأشيرة"
                  name={`${prefix}.validity`}
                  nameAr={`${prefix}.validityAr`}
                  en={draft.validity}
                  ar={draft.validityAr}
                  onPhrase={(phrase) =>
                    patch(draft.key, (item) => {
                      const validity = phrase?.en || null;
                      const validityAr = phrase?.ar || null;
                      if (item.validity === validity && item.validityAr === validityAr) return item;
                      return { ...item, validity, validityAr };
                    })
                  }
                />
                <PairedSelect
                  label="مرات الدخول"
                  name={`${prefix}.entry`}
                  nameAr={`${prefix}.entryAr`}
                  value={draft.entry}
                  options={withCurrent(entryOptions, draft.entry)}
                  onValue={(value) =>
                    patch(draft.key, (item) => {
                      if (item.touched) return item.entry === value ? item : { ...item, entry: value };
                      const next = suggest(item.stay, value, item.stayAr, entryArabic(value));
                      return { ...item, entry: value, label: next.label, labelAr: next.labelAr };
                    })
                  }
                />
              </div>
              <FeeSummary embassy={embassy} govFee={draft.govFee} serviceFee={draft.serviceFee} expressFee={draft.expressFee} expressOn={draft.expressOn} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  {embassy ? "رسوم الحكومة (مرجع، لا تُحصّل هنا)" : "رسوم الحكومة"}
                  <input name={`${prefix}.govFee`} type="number" min="0" value={draft.govFee} onChange={(event) => patch(draft.key, (item) => ({ ...item, govFee: event.target.value }))} className={adminInputClass} />
                </label>
                <label className="text-sm">
                  رسوم المعالجة
                  <input name={`${prefix}.serviceFee`} type="number" min="0" value={draft.serviceFee} onChange={(event) => patch(draft.key, (item) => ({ ...item, serviceFee: event.target.value }))} className={adminInputClass} />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium">وقت المعالجة العادي</p>
                <DurationField
                  hours={draft.processingHours}
                  name={`${prefix}.processingHours`}
                  onHours={(hours) => patch(draft.key, (item) => (item.processingHours === hours ? item : { ...item, processingHours: hours }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={draft.expressOn} onChange={(event) => patch(draft.key, (item) => ({ ...item, expressOn: event.target.checked }))} />
                تفعيل المعالجة السريعة
              </label>
              {draft.expressOn ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm">مدة المعالجة السريعة</p>
                    <DurationField
                      hours={draft.expressHours}
                      name={`${prefix}.expressHours`}
                      onHours={(hours) => patch(draft.key, (item) => (item.expressHours === hours ? item : { ...item, expressHours: hours }))}
                    />
                  </div>
                  <label className="text-sm">
                    زيادة رسوم السرعة
                    <input name={`${prefix}.expressFee`} type="number" min="0" value={draft.expressFee} onChange={(event) => patch(draft.key, (item) => ({ ...item, expressFee: event.target.value }))} className={adminInputClass} />
                  </label>
                </div>
              ) : (
                <>
                  <input type="hidden" name={`${prefix}.expressHours`} value="" />
                  <input type="hidden" name={`${prefix}.expressFee`} value="0" />
                </>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.customDocs} onChange={(event) => patch(draft.key, (item) => ({ ...item, customDocs: event.target.checked }))} />
                مستندات خاصة بهذا النوع
              </label>
              {draft.customDocs ? (
                <DocumentChecklist
                  name={`${prefix}.documents`}
                  selected={draft.documents}
                  onChange={(documents) => patch(draft.key, (item) => ({ ...item, documents }))}
                />
              ) : (
                <p className="text-xs text-muted-ink">يستخدم هذا النوع قائمة المستندات الخاصة بالدولة.</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="defaultOption" value={draft.key} checked={defaultKey === draft.key} onChange={() => setDefaultKey(draft.key)} />
                  النوع الافتراضي
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={draft.active} onChange={(event) => patch(draft.key, (item) => ({ ...item, active: event.target.checked }))} />
                  ظاهر للعملاء
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs"
                  onClick={() => {
                    const key = `new-${seq}`;
                    setSeq((value) => value + 1);
                    setDrafts((list) => [...list, { ...draft, key, touched: true, open: true, active: true }]);
                  }}
                >
                  <Copy className="size-3.5" /> نسخ
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs text-red-700"
                  onClick={() => {
                    if (drafts.length === 1) return;
                    const next = drafts.filter((item) => item.key !== draft.key);
                    setDrafts(next);
                    if (defaultKey === draft.key) setDefaultKey(next.find((item) => item.active)?.key ?? next[0]!.key);
                  }}
                >
                  <Trash2 className="size-3.5" /> حذف
                </button>
              </div>
            </div>
          </section>
        );
      })}
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
        onClick={() => {
          const key = `new-${seq}`;
          setSeq((value) => value + 1);
          setDrafts((list) => [...list, blank(key)]);
        }}
      >
        <Plus className="size-4" /> إضافة نوع تأشيرة
      </button>
    </div>
  );
}
