"use client";

import { useMemo, useState, useTransition } from "react";
import { adminDeletePage, adminSavePage, adminSetPagePublished } from "@/app/actions/admin";
import { AdminCard, AdminPage, MasterDetail, MasterList, MasterRow, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import { BUILTIN_SLUGS, TEMPLATES, defaultContent, templateFields, type CmsTemplate } from "@/lib/cms/registry";
import type { ManagedPage } from "@/lib/data/pages";

export function PageEditor({ locale, pages }: { locale: string; pages: ManagedPage[] }) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(pages[0]?.id ?? "new");
  const [query, setQuery] = useState("");
  const [template, setTemplate] = useState<CmsTemplate>("prose");
  const [message, setMessage] = useState<string | null>(null);
  const visible = pages.filter((page) => `${page.title} ${page.slug}`.toLowerCase().includes(query.trim().toLowerCase()));
  const current = pages.find((page) => page.id === selected);
  const fields = useMemo(() => templateFields(current?.template ?? template), [current, template]);
  const content = current?.content ?? defaultContent("", template);

  return (
    <AdminPage
      title="الصفحات"
      description="إخفاء الصفحة يجعل رابطها 404. حذف الصفحات المدمجة يخفيها ولا يمسح القالب."
    >
      <MasterDetail
        list={
          <MasterList query={query} onQuery={setQuery} placeholder="بحث" action={<button type="button" className="h-9 shrink-0 rounded-lg bg-black px-3 text-xs text-white" onClick={() => setSelected("new")}>جديد</button>}>
            {visible.map((page) => (
              <MasterRow
                key={page.id}
                active={selected === page.id}
                title={page.title}
                meta={`${page.slug}${page.published ? "" : " · مخفية"}`}
                onClick={() => setSelected(page.id)}
              />
            ))}
          </MasterList>
        }
      >
      <AdminCard>
      <form
        key={`${selected}-${template}`}
        className="grid gap-3"
        action={(fd) => {
          setMessage(null);
          const nextTemplate = (current?.template ?? String(fd.get("template"))) as CmsTemplate;
          const nextContent: Record<string, string> = {};
          for (const field of templateFields(nextTemplate)) {
            nextContent[field.key] = String(fd.get(`field.${field.key}`) ?? "");
            nextContent[`${field.key}Ar`] = String(fd.get(`field.${field.key}Ar`) ?? "");
          }
          start(() =>
            adminSavePage(locale, {
              id: current?.id,
              slug: String(fd.get("slug")),
              template: nextTemplate,
              title: String(fd.get("title")),
              published: fd.get("published") === "on",
              sortOrder: Number(fd.get("sortOrder") || current?.sortOrder || 200),
              content: nextContent,
            }),
          );
        }}
      >
        {!current && (
          <label className="text-sm">
            القالب
            <select
              name="template"
              value={template}
              onChange={(event) => setTemplate(event.target.value as CmsTemplate)}
              className={adminInputClass}
            >
              {TEMPLATES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm">
          العنوان في اللوحة
          <input required name="title" defaultValue={current?.title ?? ""} className={adminInputClass} />
        </label>
        <label className="text-sm">
          الرابط
          <input required name="slug" defaultValue={current?.slug ?? ""} className={adminInputClass} />
        </label>
        <label className="text-sm">
          الترتيب
          <input name="sortOrder" type="number" defaultValue={current?.sortOrder ?? 200} className={adminInputClass} />
        </label>
        {fields.map((field) => (
          <label key={field.key} className="text-sm">
            {field.label}
            {field.hint && <span className="mt-1 block text-xs text-muted-ink">{field.hint}</span>}
            {field.multiline ? (
              <textarea name={`field.${field.key}`} defaultValue={content[field.key] ?? ""} className={adminTextareaClass} />
            ) : (
              <input name={`field.${field.key}`} defaultValue={content[field.key] ?? ""} className={adminInputClass} />
            )}
            <span className="mt-2 block text-xs text-muted-ink">العربية</span>
            {field.multiline ? (
              <textarea name={`field.${field.key}Ar`} defaultValue={content[`${field.key}Ar`] ?? ""} className={adminTextareaClass} dir="rtl" />
            ) : (
              <input name={`field.${field.key}Ar`} defaultValue={content[`${field.key}Ar`] ?? ""} className={adminInputClass} dir="rtl" />
            )}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={current?.published ?? true} /> منشورة
        </label>
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} className={adminPrimaryClass}>
            حفظ
          </button>
          {current && (
            <>
              <button
                type="button"
                className={adminGhostClass}
                onClick={() => start(() => adminSetPagePublished(locale, current.id, current.slug, !current.published))}
              >
                {current.published ? "إخفاء" : "نشر"}
              </button>
              <button
                type="button"
                className={adminDangerClass}
                onClick={() =>
                  start(async () => {
                    const result = await adminDeletePage(locale, current.id, current.slug);
                    if (result.ok && result.hidden) setMessage("الصفحة المدمجة أُخفيت وأصبحت 404.");
                    else if (result.ok) setSelected("new");
                    else setMessage(result.error);
                  })
                }
              >
                {BUILTIN_SLUGS.has(current.slug) ? "إخفاء نهائي" : "حذف"}
              </button>
            </>
          )}
        </div>
        {message && <p className="text-sm text-muted-ink">{message}</p>}
      </form>
      </AdminCard>
      </MasterDetail>
    </AdminPage>
  );
}
