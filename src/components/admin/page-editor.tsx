"use client";

import { useMemo, useState } from "react";
import { adminDeletePage, adminSavePage, adminSetPagePublished } from "@/app/actions/admin";
import { AdminError, AdminPage, FilterChip, MasterDetail, MasterList, MasterRow, Pill, adminGhostClass, adminPrimaryClass, type Tone } from "@/components/admin/chrome";
import { useEditorKeys } from "@/components/admin/chrome-client";
import { ChipCount, EditorCard, FieldShell, ListScroll, SelectField, TextField, errorCount, type Issue } from "@/components/admin/content/fields";
import { matches } from "@/components/admin/content/text";
import { NEW, SaveBar, useMaster } from "@/components/admin/content/use-master";
import { BUILTIN_SLUGS, TEMPLATES, defaultContent, templateFields, type CmsTemplate } from "@/lib/cms/registry";
import type { ManagedPage } from "@/lib/data/pages";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

type Workflow = ManagedPage["workflowStatus"];
type Draft = { template: CmsTemplate; title: string; slug: string; sortOrder: string; workflow: Workflow; content: Record<string, string> };

const workflows: { value: Workflow; label: string; tone: Tone; hint: string }[] = [
  { value: "draft", label: "مسودة", tone: "neutral", hint: "مخفية عن الزوار. تُعاين برابط المعاينة فقط." },
  { value: "review", label: "مراجعة", tone: "warning", hint: "بانتظار المراجعة. مخفية عن الزوار." },
  { value: "published", label: "منشورة", tone: "success", hint: "ظاهرة للجميع على رابطها." },
  { value: "archived", label: "مؤرشفة", tone: "danger", hint: "رابطها يعرض 404." },
];
const workflowMeta = (value: Workflow) => workflows.find((item) => item.value === value) ?? workflows[2]!;

function contentFor(template: CmsTemplate, stored: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const field of templateFields(template)) {
    out[field.key] = stored[field.key] ?? "";
    out[`${field.key}Ar`] = stored[`${field.key}Ar`] ?? "";
  }
  return out;
}

function toDraft(page: ManagedPage | undefined): Draft {
  if (!page) return { template: "prose", title: "", slug: "", sortOrder: "200", workflow: "draft", content: contentFor("prose", {}) };
  return {
    template: page.template,
    title: page.title,
    slug: page.slug,
    sortOrder: String(page.sortOrder),
    workflow: page.workflowStatus ?? (page.published ? "published" : "archived"),
    content: contentFor(page.template, page.content ?? {}),
  };
}

const slugPattern = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;

export function PageEditor({
  locale,
  pages,
  canEdit,
  canDelete,
  canPublish,
}: {
  locale: string;
  pages: ManagedPage[];
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Workflow | "all">("all");
  const master = useMaster({
    items: pages,
    idOf: (page) => page.id,
    toDraft,
    isCreated: (page, draft) => page.slug === draft.slug.trim().replace(/^\/+|\/+$/g, ""),
  });
  const { values, set, current } = master;
  const fields = templateFields(values.template);
  const fallback = useMemo(() => defaultContent(values.slug.trim(), values.template), [values.slug, values.template]);
  const builtin = BUILTIN_SLUGS.has(current?.slug ?? values.slug.trim());

  const issues = useMemo(() => {
    const found: Record<string, Issue> = {};
    const slug = values.slug.trim().replace(/^\/+|\/+$/g, "");
    if (!values.title.trim()) found.title = { level: "error", message: "اسم الصفحة في اللوحة مطلوب." };
    if (!slug) found.slug = { level: "error", message: "الرابط مطلوب." };
    else if (!slugPattern.test(slug)) found.slug = { level: "error", message: "حروف إنجليزية صغيرة وأرقام وشرطة فقط، مثل about-us أو legal/terms." };
    else if (pages.some((page) => page.slug === slug && page.id !== current?.id)) found.slug = { level: "error", message: "صفحة أخرى تستخدم هذا الرابط." };
    else if (current && slug !== current.slug && BUILTIN_SLUGS.has(current.slug)) found.slug = { level: "warn", message: "تغيير رابط صفحة مدمجة يجعل رابطها الأصلي يعرض المحتوى الافتراضي." };
    if (values.sortOrder.trim() && !/^-?\d+$/.test(values.sortOrder.trim())) found.sortOrder = { level: "error", message: "الترتيب رقم صحيح." };
    for (const field of fields) {
      const en = values.content[field.key]?.trim() ?? "";
      const ar = values.content[`${field.key}Ar`]?.trim() ?? "";
      if (en && !ar) found[`${field.key}Ar`] = { level: "warn", message: "بدون ترجمة، يظهر النص الإنجليزي في الموقع العربي." };
    }
    return found;
  }, [values, pages, current, fields]);
  const errors = errorCount(issues);
  const missingAr = fields.filter((field) => issues[`${field.key}Ar`]).length;

  const save = () => {
    if (!canEdit || master.pending) return;
    if (errors) {
      master.setNotice({ tone: "danger", text: "صحّح الحقول المعلّمة بالأحمر قبل الحفظ." });
      return;
    }
    if (!master.dirty && current) return;
    master.save(
      (draft) =>
        adminSavePage(locale, {
          id: current?.id,
          slug: draft.slug.trim(),
          template: draft.template,
          title: draft.title.trim(),
          published: draft.workflow === "published",
          workflowStatus: draft.workflow,
          sortOrder: Number(draft.sortOrder.trim() || 200),
          content: draft.content,
        }),
      current ? "حُفظت الصفحة." : "أُنشئت الصفحة.",
    );
  };
  useEditorKeys(save, master.dirty);

  const counts = Object.fromEntries(workflows.map((item) => [item.value, pages.filter((page) => page.workflowStatus === item.value).length])) as Record<Workflow, number>;
  const visible = pages.filter((page) => (filter === "all" || page.workflowStatus === filter) && matches(query, page.title, page.slug, page.content?.title, page.content?.titleAr));
  const meta = workflowMeta(values.workflow);
  const publicHref = current ? href(`/${current.slug}`, locale) : null;
  const previewHref = current ? `${href(`/${current.slug}`, locale)}?preview=1` : null;

  const setContent = (key: string) => (value: string) => master.setValues((draft) => ({ ...draft, content: { ...draft.content, [key]: value } }));

  return (
    <AdminPage
      title="الصفحات"
      description="محتوى الصفحات الثابتة باللغتين. إخفاء الصفحة يجعل رابطها 404، وحذف الصفحات المدمجة يخفيها ولا يمسح قالبها."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="success" dot>{counts.published} منشورة</Pill>
          {counts.draft + counts.review ? <Pill tone="warning" dot>{counts.draft + counts.review} قيد العمل</Pill> : null}
          {counts.archived ? <Pill tone="danger" dot>{counts.archived} مؤرشفة</Pill> : null}
        </div>
      }
    >
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="ابحث بالاسم أو الرابط"
            action={
              <button type="button" className={cn(adminPrimaryClass, "shrink-0 px-3")} disabled={!canEdit} onClick={() => master.choose(NEW)}>
                جديد
              </button>
            }
            filters={
              <>
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}><ChipCount count={pages.length}>الكل</ChipCount></FilterChip>
                {workflows.map((item) => (
                  <FilterChip key={item.value} active={filter === item.value} onClick={() => setFilter(item.value)}>
                    <ChipCount count={counts[item.value]}>{item.label}</ChipCount>
                  </FilterChip>
                ))}
              </>
            }
          >
            <ListScroll>
            {master.isNew ? <MasterRow active title={values.title.trim() || "صفحة جديدة"} meta="لم تُحفظ بعد" onClick={() => undefined} /> : null}
            {visible.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد صفحات مطابقة.</p> : null}
            {visible.map((page) => {
              const status = workflowMeta(page.workflowStatus);
              return (
                <MasterRow
                  key={page.id}
                  active={master.selected === page.id}
                  title={page.title}
                  meta={`/${page.slug}${BUILTIN_SLUGS.has(page.slug) ? " · مدمجة" : ""}`}
                  badge={<Pill tone={status.tone}>{status.label}</Pill>}
                  onClick={() => master.choose(page.id)}
                />
              );
            })}
            </ListScroll>
          </MasterList>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="space-y-5"
        >
          <EditorCard
            eyebrow={current ? (builtin ? "صفحة مدمجة" : "صفحة مخصصة") : "صفحة جديدة"}
            title={values.title.trim() || "صفحة بدون اسم"}
            meta={
              <>
                <span dir="ltr" className="font-mono">/{values.slug.trim() || "…"}</span>
                <span aria-hidden>·</span>
                <span>{TEMPLATES.find((item) => item.id === values.template)?.label ?? values.template}</span>
              </>
            }
            status={<Pill tone={meta.tone} dot>{meta.label}</Pill>}
            actions={
              current ? (
                <>
                  {current.published ? (
                    <a href={publicHref!} target="_blank" rel="noreferrer" className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
                      فتح الصفحة ↗
                    </a>
                  ) : (
                    <a href={previewHref!} target="_blank" rel="noreferrer" className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
                      معاينة ↗
                    </a>
                  )}
                  {canPublish ? (
                    <button
                      type="button"
                      disabled={master.pending || master.dirty}
                      title={master.dirty ? "احفظ التغييرات أولاً" : undefined}
                      className={cn(current.published ? adminGhostClass : adminPrimaryClass, "h-8 px-3 text-xs")}
                      onClick={() =>
                        master.run(
                          () => adminSetPagePublished(locale, current.id, current.slug, !current.published),
                          current.published ? "أُخفيت الصفحة، ورابطها يعرض 404 الآن." : "نُشرت الصفحة.",
                        )
                      }
                    >
                      {current.published ? "إخفاء" : "نشر الآن"}
                    </button>
                  ) : null}
                </>
              ) : null
            }
          >
            {!current ? (
              <SelectField
                label="القالب"
                value={values.template}
                onChange={(value) => master.setValues((draft) => ({ ...draft, template: value as CmsTemplate, content: contentFor(value as CmsTemplate, draft.content) }))}
                options={TEMPLATES.map((item) => ({ value: item.id, label: item.label }))}
                hint="يحدد الحقول وشكل الصفحة. لا يتغير بعد الإنشاء."
                span
                disabled={!canEdit}
              />
            ) : null}
            <TextField label="اسم الصفحة في اللوحة" value={values.title} onChange={set("title")} issue={issues.title} required disabled={!canEdit} counter={{ max: 60 }} />
            <TextField
              label="الرابط"
              value={values.slug}
              onChange={(value) => set("slug")(value.toLowerCase().replace(/\s+/g, "-"))}
              issue={issues.slug}
              required
              dir="ltr"
              disabled={!canEdit}
              placeholder="about-us"
              hint={<span dir="ltr">evisa.tv/{locale}/{values.slug.trim() || "…"}</span>}
            />
            <SelectField
              label="حالة النشر"
              value={values.workflow}
              onChange={(value) => set("workflow")(value as Workflow)}
              options={workflows.map((item) => ({ value: item.value, label: item.label }))}
              hint={meta.hint}
              disabled={!canEdit}
            />
            <TextField label="الترتيب" value={values.sortOrder} onChange={set("sortOrder")} issue={issues.sortOrder} dir="ltr" inputMode="numeric" hint="ترتيب الصفحة في القوائم. الأصغر أولاً." disabled={!canEdit} />
          </EditorCard>

          <section className="overflow-hidden rounded-xl border bg-card">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">المحتوى</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  كل حقل بالإنجليزية والعربية. الحقل الفارغ يعرض النص الافتراضي للقالب، وهو ظاهر كنص باهت داخل الحقل.
                </p>
              </div>
              {missingAr ? <Pill tone="warning">{missingAr} حقل بدون عربي</Pill> : <Pill tone="success">المحتوى مترجم</Pill>}
            </header>
            <div className="divide-y">
              {fields.map((field) => {
                const en = values.content[field.key] ?? "";
                const ar = values.content[`${field.key}Ar`] ?? "";
                const counter = field.multiline ? undefined : { max: 120 };
                return (
                  <div key={field.key} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                    <TextField
                      label={field.label}
                      badge="EN"
                      value={en}
                      onChange={setContent(field.key)}
                      dir="ltr"
                      multiline={field.multiline}
                      rows={field.multiline ? 5 : undefined}
                      counter={counter}
                      placeholder={fallback[field.key] || undefined}
                      hint={field.hint}
                      disabled={!canEdit}
                    />
                    <TextField
                      label={field.label}
                      badge="AR"
                      value={ar}
                      onChange={setContent(`${field.key}Ar`)}
                      dir="rtl"
                      multiline={field.multiline}
                      rows={field.multiline ? 5 : undefined}
                      counter={counter}
                      placeholder={fallback[`${field.key}Ar`] || undefined}
                      issue={issues[`${field.key}Ar`]}
                      disabled={!canEdit}
                    />
                  </div>
                );
              })}
              {fields.length === 0 ? (
                <FieldShell label="لا حقول" className="px-6 py-5">
                  <p className="mt-1 text-xs text-muted-foreground">هذا القالب لا يحتوي حقولاً قابلة للتعديل.</p>
                </FieldShell>
              ) : null}
            </div>
          </section>

          <SaveBar
            isNew={master.isNew}
            dirty={master.dirty}
            pending={master.pending}
            notice={master.notice}
            errors={errors}
            canSave={canEdit && (master.dirty || master.isNew)}
            saveLabel={current ? "حفظ الصفحة" : "إنشاء الصفحة"}
            onDiscard={master.discard}
            deleteLabel={builtin ? "إخفاء نهائي" : "حذف"}
            onDelete={
              current && canDelete
                ? () =>
                    master.run(async () => {
                      const result = await adminDeletePage(locale, current.id, current.slug);
                      return result.ok ? { ok: true } : result;
                    }, builtin ? "الصفحة المدمجة أُخفيت ورابطها يعرض 404." : "حُذفت الصفحة.")
                : undefined
            }
          />
        </form>
      </MasterDetail>
    </AdminPage>
  );
}
