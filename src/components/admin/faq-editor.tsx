"use client";

import { useMemo, useState } from "react";
import { adminDeleteFaq, adminSaveFaq } from "@/app/actions/admin";
import { AdminError, AdminPage, FilterChip, MasterDetail, MasterList, MasterRow, Pill, adminPrimaryClass } from "@/components/admin/chrome";
import { useEditorKeys } from "@/components/admin/chrome-client";
import { ChipCount, EditorCard, LangSwitch, ListScroll, PreviewFrame, SelectField, TextField, errorCount, type Issues } from "@/components/admin/content/fields";
import { byText, hasArabic, matches } from "@/components/admin/content/text";
import { NEW, SaveBar, useMaster } from "@/components/admin/content/use-master";
import type { Faq } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = { scope: string; category: string; categoryAr: string; question: string; questionAr: string; answer: string; answerAr: string; sortOrder: string };

const scopeLabels: Record<string, string> = {
  home: "الرئيسية",
  visa: "صفحات التأشيرة",
  refunds: "الاسترداد",
  emergency: "الطوارئ",
};
const knownScopes = Object.keys(scopeLabels);
const scopeLabel = (scope: string) => scopeLabels[scope] ?? scope;

const empty: Draft = { scope: "home", category: "", categoryAr: "", question: "", questionAr: "", answer: "", answerAr: "", sortOrder: "99" };

function toDraft(faq: Faq | undefined): Draft {
  if (!faq) return empty;
  return {
    scope: faq.scope,
    category: faq.category,
    categoryAr: faq.categoryAr ?? "",
    question: faq.question,
    questionAr: faq.questionAr ?? "",
    answer: faq.answer,
    answerAr: faq.answerAr ?? "",
    sortOrder: String(faq.sortOrder),
  };
}

const missingArabic = (faq: Faq) => !faq.questionAr?.trim() || !faq.answerAr?.trim();

function collectIssues(values: Draft): Issues<keyof Draft> {
  const issues: Issues<keyof Draft> = {};
  if (!values.scope.trim()) issues.scope = { level: "error", message: "اختر مكان الظهور." };
  if (!values.category.trim()) issues.category = { level: "error", message: "التصنيف مطلوب. الأسئلة تُجمع تحته في الصفحة." };
  if (!values.question.trim()) issues.question = { level: "error", message: "السؤال بالإنجليزية مطلوب." };
  if (!values.answer.trim()) issues.answer = { level: "error", message: "الإجابة بالإنجليزية مطلوبة." };
  if (!values.questionAr.trim()) issues.questionAr = { level: "warn", message: "بدون ترجمة، يرى الزائر العربي السؤال بالإنجليزية." };
  else if (!hasArabic(values.questionAr)) issues.questionAr = { level: "warn", message: "لا يبدو النص عربياً." };
  if (!values.answerAr.trim()) issues.answerAr = { level: "warn", message: "بدون ترجمة، تظهر الإجابة بالإنجليزية في الموقع العربي." };
  if (values.question.includes("{country}") !== values.questionAr.includes("{country}") && values.questionAr.trim()) {
    issues.questionAr = { level: "warn", message: "النسخة الإنجليزية تستخدم {country} والعربية لا، أو العكس." };
  }
  if (values.scope !== "visa" && `${values.question}${values.answer}`.includes("{country}")) {
    issues.question = { level: "warn", message: "{country} يُستبدل فقط في صفحات التأشيرة." };
  }
  if (values.sortOrder.trim() && !/^-?\d+$/.test(values.sortOrder.trim())) issues.sortOrder = { level: "error", message: "الترتيب رقم صحيح." };
  return issues;
}

export function FaqEditor({
  locale,
  faqs,
  destinations,
  canEdit,
  canDelete,
}: {
  locale: string;
  faqs: Faq[];
  destinations: Record<string, string>;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const master = useMaster({
    items: faqs,
    idOf: (faq) => faq.id,
    toDraft,
    isCreated: (faq, draft) => faq.question === draft.question && faq.scope === draft.scope,
  });
  const { values, set, current } = master;
  const issues = useMemo(() => collectIssues(values), [values]);
  const errors = errorCount(issues);
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const scopes = useMemo(() => {
    const extra = [...new Set(faqs.map((faq) => faq.scope))].filter((item) => !knownScopes.includes(item)).sort(byText);
    return [...knownScopes, ...extra];
  }, [faqs]);
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const faq of faqs) if (faq.scope === values.scope && !map.has(faq.category)) map.set(faq.category, faq.categoryAr ?? "");
    return [...map.entries()];
  }, [faqs, values.scope]);
  const missingCount = faqs.filter(missingArabic).length;

  const save = () => {
    if (!canEdit || master.pending) return;
    if (errors) {
      master.setNotice({ tone: "danger", text: "صحّح الحقول المعلّمة بالأحمر قبل الحفظ." });
      return;
    }
    if (!master.dirty && current) return;
    master.save(
      (draft) =>
        adminSaveFaq(locale, {
          id: current?.id,
          scope: draft.scope.trim(),
          category: draft.category.trim(),
          categoryAr: draft.categoryAr.trim() || null,
          question: draft.question.trim(),
          questionAr: draft.questionAr.trim() || null,
          answer: draft.answer.trim(),
          answerAr: draft.answerAr.trim() || null,
          destinationId: current?.destinationId ?? null,
          sortOrder: Number(draft.sortOrder.trim() || 99),
        }),
      current ? "حُفظ السؤال." : "أُضيف السؤال.",
    );
  };
  useEditorKeys(save, master.dirty);

  const visible = faqs.filter(
    (faq) =>
      (scope === "all" || faq.scope === scope) &&
      (!onlyMissing || missingArabic(faq)) &&
      matches(query, faq.question, faq.questionAr, faq.category, faq.categoryAr, faq.answer, faq.answerAr),
  );

  const pickCategory = (value: string) => {
    const known = categories.find(([name]) => name === value);
    master.setValues((draft) => ({ ...draft, category: value, categoryAr: known && !draft.categoryAr.trim() ? known[1] : draft.categoryAr }));
  };

  const previewQuestion = lang === "ar" ? values.questionAr || values.question : values.question;
  const previewAnswer = lang === "ar" ? values.answerAr || values.answer : values.answer;
  const previewCategory = lang === "ar" ? values.categoryAr || values.category : values.category;

  return (
    <AdminPage
      title="الأسئلة الشائعة"
      description="أسئلة الصفحة الرئيسية وصفحات التأشيرة والاسترداد والطوارئ. اكتب كل سؤال باللغتين، والعربية تظهر كما تكتبها."
      action={missingCount ? <Pill tone="warning" dot>{missingCount} بدون ترجمة عربية</Pill> : <Pill tone="success" dot>كل الأسئلة مترجمة</Pill>}
    >
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="ابحث في الأسئلة والإجابات"
            action={
              <button type="button" className={cn(adminPrimaryClass, "shrink-0 px-3")} disabled={!canEdit} onClick={() => master.choose(NEW)}>
                جديد
              </button>
            }
            filters={
              <>
                <FilterChip active={scope === "all"} onClick={() => setScope("all")}><ChipCount count={faqs.length}>الكل</ChipCount></FilterChip>
                {scopes.map((item) => (
                  <FilterChip key={item} active={scope === item} onClick={() => setScope(item)}>
                    <ChipCount count={faqs.filter((faq) => faq.scope === item).length}>{scopeLabel(item)}</ChipCount>
                  </FilterChip>
                ))}
                <FilterChip active={onlyMissing} onClick={() => setOnlyMissing((value) => !value)}>
                  <ChipCount count={missingCount}>بدون عربي</ChipCount>
                </FilterChip>
              </>
            }
            footer={`${visible.length} من ${faqs.length} سؤال`}
          >
            <ListScroll>
            {master.isNew ? <MasterRow active title={values.questionAr.trim() || values.question.trim() || "سؤال جديد"} meta="لم يُحفظ بعد" onClick={() => undefined} /> : null}
            {visible.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد أسئلة مطابقة.</p> : null}
            {visible.map((faq) => (
              <MasterRow
                key={faq.id}
                active={master.selected === faq.id}
                title={faq.questionAr?.trim() || faq.question}
                meta={`${scopeLabel(faq.scope)} · ${faq.categoryAr || faq.category}${faq.destinationId ? ` · ${destinations[faq.destinationId] ?? "وجهة"}` : ""}`}
                badge={missingArabic(faq) ? <Pill tone="warning">بدون عربي</Pill> : undefined}
                onClick={() => master.choose(faq.id)}
              />
            ))}
            </ListScroll>
          </MasterList>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <EditorCard
            eyebrow={current ? "تعديل سؤال" : "سؤال جديد"}
            title={values.questionAr.trim() || values.question.trim() || "سؤال بدون نص"}
            meta={
              <>
                <Pill tone="info">{scopeLabel(values.scope)}</Pill>
                {current?.destinationId ? <Pill>خاص بـ {destinations[current.destinationId] ?? "وجهة"}</Pill> : <span>يظهر في كل صفحات هذا القسم</span>}
              </>
            }
            status={values.questionAr.trim() && values.answerAr.trim() ? <Pill tone="success" dot>مترجم</Pill> : <Pill tone="warning" dot>ينقصه العربي</Pill>}
            aside={
              <PreviewFrame label="معاينة" action={<LangSwitch value={lang} onChange={setLang} />}>
                <div dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-lg bg-[#ffffff] p-4 text-start text-[#0b0d12]">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">{previewCategory || "—"}</p>
                  <p className="mt-2 flex items-start justify-between gap-3 text-sm font-semibold leading-snug">
                    <span>{previewQuestion || "السؤال"}</span>
                    <span className="text-[#9ca3af]" aria-hidden>−</span>
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#4b5563]">{previewAnswer || "الإجابة"}</p>
                </div>
                {values.scope === "visa" ? <p className="mt-2 text-xs text-muted-foreground">{"{country}"} يُستبدل باسم الدولة في كل صفحة تأشيرة.</p> : null}
              </PreviewFrame>
            }
          >
            <SelectField
              label="مكان الظهور"
              value={values.scope}
              onChange={set("scope")}
              options={scopes.map((item) => ({ value: item, label: `${scopeLabel(item)} (${item})` }))}
              issue={issues.scope}
              required
              disabled={!canEdit}
            />
            <TextField label="الترتيب" value={values.sortOrder} onChange={set("sortOrder")} issue={issues.sortOrder} dir="ltr" inputMode="numeric" hint="الأصغر يظهر أولاً." disabled={!canEdit} />
            <TextField label="التصنيف" badge="EN" value={values.category} onChange={pickCategory} issue={issues.category} required dir="ltr" list="faq-categories" disabled={!canEdit} hint="اختر تصنيفاً موجوداً ليتجمّع معه." />
            <TextField label="التصنيف" badge="AR" value={values.categoryAr} onChange={set("categoryAr")} dir="rtl" disabled={!canEdit} />
            <datalist id="faq-categories">
              {categories.map(([name]) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <TextField label="السؤال" badge="EN" value={values.question} onChange={set("question")} issue={issues.question} required dir="ltr" counter={{ max: 120 }} disabled={!canEdit} />
            <TextField label="السؤال" badge="AR" value={values.questionAr} onChange={set("questionAr")} issue={issues.questionAr} dir="rtl" counter={{ max: 120 }} disabled={!canEdit} />
            <TextField label="الإجابة" badge="EN" value={values.answer} onChange={set("answer")} issue={issues.answer} required dir="ltr" multiline rows={6} counter={{ max: 600 }} disabled={!canEdit} />
            <TextField label="الإجابة" badge="AR" value={values.answerAr} onChange={set("answerAr")} issue={issues.answerAr} dir="rtl" multiline rows={6} counter={{ max: 600 }} disabled={!canEdit} />
          </EditorCard>
          <SaveBar
            isNew={master.isNew}
            dirty={master.dirty}
            pending={master.pending}
            notice={master.notice}
            errors={errors}
            canSave={canEdit && (master.dirty || master.isNew)}
            saveLabel={current ? "حفظ السؤال" : "إضافة السؤال"}
            onDiscard={master.discard}
            onDelete={current && canDelete ? () => master.run(() => adminDeleteFaq(locale, current.id), "حُذف السؤال.") : undefined}
          />
        </form>
      </MasterDetail>
    </AdminPage>
  );
}
