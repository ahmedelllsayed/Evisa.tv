"use client";

import { useMemo, useState } from "react";
import { adminDeleteReview, adminSaveReview } from "@/app/actions/admin";
import { AdminError, AdminPage, FilterChip, MasterDetail, MasterList, MasterRow, Pill, adminPrimaryClass } from "@/components/admin/chrome";
import { useEditorKeys } from "@/components/admin/chrome-client";
import { ChipCount, EditorCard, FieldShell, LangSwitch, ListScroll, PreviewFrame, SelectField, StarRating, Stars, TextField, Toggle, errorCount, type Issues } from "@/components/admin/content/fields";
import { byText, formatDay, hasArabic, isHttpUrl, matches } from "@/components/admin/content/text";
import { NEW, SaveBar, useMaster } from "@/components/admin/content/use-master";
import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = {
  scope: string;
  author: string;
  location: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  rating: number;
  product: string;
  isSample: boolean;
  verified: boolean;
  source: string;
};
type Status = "all" | "verified" | "sample" | "missing";

const scopeLabels: Record<string, string> = { wall: "جدار الحب", home: "الرئيسية", visa: "صفحات التأشيرة", refunds: "صفحة الاسترداد" };
const knownScopes = Object.keys(scopeLabels);
const scopeLabel = (scope: string) => scopeLabels[scope] ?? scope;

const empty: Draft = { scope: "wall", author: "", location: "", title: "", titleAr: "", body: "", bodyAr: "", rating: 5, product: "", isSample: false, verified: false, source: "" };

function toDraft(review: Review | undefined): Draft {
  if (!review) return empty;
  return {
    scope: review.scope,
    author: review.author,
    location: review.location ?? "",
    title: review.title ?? "",
    titleAr: review.titleAr ?? "",
    body: review.body,
    bodyAr: review.bodyAr ?? "",
    rating: review.rating || 5,
    product: review.product ?? "",
    isSample: Boolean(review.isSample),
    verified: Boolean(review.verified),
    source: review.source ?? "",
  };
}

const missingArabic = (review: Review) => !review.bodyAr?.trim();

function collectIssues(values: Draft): Issues<keyof Draft> {
  const issues: Issues<keyof Draft> = {};
  if (!values.author.trim()) issues.author = { level: "error", message: "اسم صاحب التقييم مطلوب." };
  if (!values.body.trim()) issues.body = { level: "error", message: "نص التقييم مطلوب." };
  if (!values.bodyAr.trim()) issues.bodyAr = { level: "warn", message: "بدون ترجمة، يظهر النص الإنجليزي في الموقع العربي." };
  else if (!hasArabic(values.bodyAr)) issues.bodyAr = { level: "warn", message: "لا يبدو النص عربياً." };
  if (values.title.trim() && !values.titleAr.trim()) issues.titleAr = { level: "warn", message: "العنوان بدون ترجمة عربية." };
  if (values.verified && values.isSample) issues.verified = { level: "warn", message: "التقييم المثال لا يكون موثّقاً. أوقف أحدهما." };
  else if (values.verified && !values.source.trim()) issues.source = { level: "warn", message: "اذكر مصدر التوثيق، مثل رقم الطلب أو رابط Google." };
  if (values.source.trim().startsWith("http") && !isHttpUrl(values.source.trim())) issues.source = { level: "error", message: "الرابط غير صالح." };
  return issues;
}

export function ReviewEditor({
  locale,
  reviews,
  canEdit,
  canDelete,
}: {
  locale: string;
  reviews: Review[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [scope, setScope] = useState("all");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const master = useMaster({
    items: reviews,
    idOf: (review) => review.id,
    toDraft,
    isCreated: (review, draft) => review.author === draft.author.trim() && review.body === draft.body.trim(),
  });
  const { values, set, current } = master;
  const issues = useMemo(() => collectIssues(values), [values]);
  const errors = errorCount(issues);

  const scopes = useMemo(() => [...knownScopes, ...[...new Set(reviews.map((review) => review.scope))].filter((item) => !knownScopes.includes(item)).sort(byText)], [reviews]);
  const counts = {
    verified: reviews.filter((review) => review.verified).length,
    sample: reviews.filter((review) => review.isSample).length,
    missing: reviews.filter(missingArabic).length,
  };
  const real = reviews.filter((review) => !review.isSample);
  const average = real.length ? real.reduce((sum, review) => sum + review.rating, 0) / real.length : null;

  const save = () => {
    if (!canEdit || master.pending) return;
    if (errors) {
      master.setNotice({ tone: "danger", text: "صحّح الحقول المعلّمة بالأحمر قبل الحفظ." });
      return;
    }
    if (!master.dirty && current) return;
    master.save(
      (draft) =>
        adminSaveReview(locale, {
          id: current?.id,
          scope: draft.scope.trim() || "wall",
          author: draft.author.trim(),
          location: draft.location.trim() || null,
          title: draft.title.trim() || null,
          titleAr: draft.titleAr.trim() || null,
          body: draft.body.trim(),
          bodyAr: draft.bodyAr.trim() || null,
          rating: draft.rating,
          product: draft.product.trim() || null,
          destinationId: current?.destinationId ?? null,
          isSample: draft.isSample,
          verified: draft.verified,
          source: draft.source.trim() || null,
        }),
      current ? "حُفظ التقييم." : "أُضيف التقييم.",
    );
  };
  useEditorKeys(save, master.dirty);

  const visible = reviews.filter(
    (review) =>
      (scope === "all" || review.scope === scope) &&
      (status === "all" || (status === "verified" && review.verified) || (status === "sample" && review.isSample) || (status === "missing" && missingArabic(review))) &&
      matches(query, review.author, review.product, review.body, review.bodyAr, review.title, review.titleAr, review.location),
  );

  const previewTitle = lang === "ar" ? values.titleAr || values.title : values.title;
  const previewBody = lang === "ar" ? values.bodyAr || values.body : values.body;

  return (
    <AdminPage
      title="التقييمات"
      description="آراء المسافرين في جدار الحب وصفحات التأشيرة. التقييمات المعلّمة «مثال» لا تدخل في عدد التقييمات ولا في متوسطها."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="success" dot>{counts.verified} موثّق</Pill>
          <Pill tone="warning" dot>{counts.sample} مثال</Pill>
          {average != null ? <Pill tone="info">متوسط الحقيقية {average.toFixed(1)} ★</Pill> : null}
        </div>
      }
    >
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="ابحث بالاسم أو النص أو المنتج"
            action={
              <button type="button" className={cn(adminPrimaryClass, "shrink-0 px-3")} disabled={!canEdit} onClick={() => master.choose(NEW)}>
                جديد
              </button>
            }
            filters={
              <>
                <FilterChip active={status === "all"} onClick={() => setStatus("all")}><ChipCount count={reviews.length}>الكل</ChipCount></FilterChip>
                <FilterChip active={status === "verified"} onClick={() => setStatus("verified")}><ChipCount count={counts.verified}>موثّقة</ChipCount></FilterChip>
                <FilterChip active={status === "sample"} onClick={() => setStatus("sample")}><ChipCount count={counts.sample}>أمثلة</ChipCount></FilterChip>
                <FilterChip active={status === "missing"} onClick={() => setStatus("missing")}><ChipCount count={counts.missing}>بدون عربي</ChipCount></FilterChip>
                <span className="mx-1 my-1 w-px self-stretch bg-border" aria-hidden />
                <FilterChip active={scope === "all"} onClick={() => setScope("all")}>كل الأماكن</FilterChip>
                {scopes.map((item) => (
                  <FilterChip key={item} active={scope === item} onClick={() => setScope(item)}>
                    <ChipCount count={reviews.filter((review) => review.scope === item).length}>{scopeLabel(item)}</ChipCount>
                  </FilterChip>
                ))}
              </>
            }
            footer={`${visible.length} من ${reviews.length} تقييم`}
          >
            <ListScroll>
            {master.isNew ? <MasterRow active title={values.author.trim() || "تقييم جديد"} meta="لم يُحفظ بعد" onClick={() => undefined} /> : null}
            {visible.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد تقييمات مطابقة.</p> : null}
            {visible.map((review) => (
              <MasterRow
                key={review.id}
                active={master.selected === review.id}
                title={review.author}
                meta={`${"★".repeat(review.rating)} · ${review.product || scopeLabel(review.scope)}${missingArabic(review) ? " · بدون عربي" : ""}`}
                badge={review.isSample ? <Pill tone="warning">مثال</Pill> : review.verified ? <Pill tone="success">موثّق</Pill> : undefined}
                onClick={() => master.choose(review.id)}
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
            eyebrow={current ? "تعديل تقييم" : "تقييم جديد"}
            title={values.author.trim() || "تقييم بدون اسم"}
            meta={
              <>
                <Stars value={values.rating} />
                <span aria-hidden>·</span>
                <span>{scopeLabel(values.scope)}</span>
                {current?.publishedAt ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{formatDay(current.publishedAt)}</span>
                  </>
                ) : null}
              </>
            }
            status={
              <>
                {values.isSample ? <Pill tone="warning" dot>مثال</Pill> : null}
                {values.verified ? <Pill tone="success" dot>موثّق</Pill> : null}
                {!values.isSample && !values.verified ? <Pill dot>غير موثّق</Pill> : null}
              </>
            }
            aside={
              <PreviewFrame label="معاينة البطاقة" action={<LangSwitch value={lang} onChange={setLang} />}>
                <div dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-lg bg-[#ffffff] p-4 text-start text-[#0b0d12]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base leading-none text-[#f59e0b]" dir="ltr">{"★".repeat(values.rating)}<span className="text-[#e5e7eb]">{"★".repeat(5 - values.rating)}</span></span>
                    {values.isSample ? <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-medium text-[#92400e]">{lang === "ar" ? "مثال" : "Sample"}</span> : null}
                  </div>
                  {previewTitle ? <p className="mt-3 text-sm font-semibold leading-snug">{previewTitle}</p> : null}
                  <p className="mt-2 line-clamp-6 text-[13px] leading-relaxed text-[#4b5563]">{previewBody || "نص التقييم"}</p>
                  <p className="mt-3 text-xs font-medium">{values.author || "الاسم"}</p>
                  <p className="text-[11px] text-[#6b7280]">{[values.location, values.product].filter(Boolean).join(" · ") || "—"}</p>
                </div>
              </PreviewFrame>
            }
          >
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <Toggle
                label="تقييم مثال"
                description="ليس من عميل. يحمل علامة «مثال» ولا يُحتسب في المتوسط."
                checked={values.isSample}
                onChange={set("isSample")}
                tone="warning"
                disabled={!canEdit}
              />
              <Toggle
                label="تقييم موثّق"
                description="تأكدنا من الطلب أو المصدر. علامة داخلية."
                checked={values.verified}
                onChange={set("verified")}
                tone="success"
                disabled={!canEdit}
              />
              {issues.verified ? <p className="text-xs text-amber-300 sm:col-span-2">{issues.verified.message}</p> : null}
            </div>
            <TextField label="الاسم" value={values.author} onChange={set("author")} issue={issues.author} required disabled={!canEdit} placeholder="مثال: Salma K." />
            <TextField label="المدينة أو البلد" value={values.location} onChange={set("location")} disabled={!canEdit} placeholder="Cairo" />
            <StarRating value={values.rating} onChange={set("rating")} disabled={!canEdit} />
            <SelectField
              label="مكان الظهور"
              value={values.scope}
              onChange={set("scope")}
              options={scopes.map((item) => ({ value: item, label: `${scopeLabel(item)} (${item})` }))}
              required
              disabled={!canEdit}
            />
            <TextField label="المنتج" value={values.product} onChange={set("product")} disabled={!canEdit} placeholder="تأشيرة المغرب" hint="يظهر تحت الاسم، مثل الوجهة أو نوع التأشيرة." />
            <TextField
              label="المصدر"
              value={values.source}
              onChange={set("source")}
              issue={issues.source}
              dir="ltr"
              disabled={!canEdit}
              placeholder="Google · Trustpilot · رقم الطلب · https://…"
              hint="من أين جاء التقييم. للمراجعة الداخلية."
            />
            <TextField label="العنوان" badge="EN" value={values.title} onChange={set("title")} dir="ltr" counter={{ max: 80 }} disabled={!canEdit} />
            <TextField label="العنوان" badge="AR" value={values.titleAr} onChange={set("titleAr")} issue={issues.titleAr} dir="rtl" counter={{ max: 80 }} disabled={!canEdit} />
            <TextField label="نص التقييم" badge="EN" value={values.body} onChange={set("body")} issue={issues.body} required dir="ltr" multiline rows={6} counter={{ max: 500 }} disabled={!canEdit} />
            <TextField label="نص التقييم" badge="AR" value={values.bodyAr} onChange={set("bodyAr")} issue={issues.bodyAr} dir="rtl" multiline rows={6} counter={{ max: 500 }} disabled={!canEdit} />
            {current?.destinationId ? (
              <FieldShell label="الربط" span>
                <p className="mt-1.5 text-xs text-muted-foreground">هذا التقييم مرتبط بوجهة محددة ويظهر في صفحتها فقط.</p>
              </FieldShell>
            ) : null}
          </EditorCard>
          <SaveBar
            isNew={master.isNew}
            dirty={master.dirty}
            pending={master.pending}
            notice={master.notice}
            errors={errors}
            canSave={canEdit && (master.dirty || master.isNew)}
            saveLabel={current ? "حفظ التقييم" : "إضافة التقييم"}
            onDiscard={master.discard}
            onDelete={current && canDelete ? () => master.run(() => adminDeleteReview(locale, current.id), "حُذف التقييم.") : undefined}
          />
        </form>
      </MasterDetail>
    </AdminPage>
  );
}
