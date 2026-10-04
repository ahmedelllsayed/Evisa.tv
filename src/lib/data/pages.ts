import "server-only";
import { notFound } from "next/navigation";
import { BUILTIN_PAGES, BUILTIN_SLUGS, defaultContent, mergeContent, type CmsContent, type CmsTemplate } from "@/lib/cms/registry";
import { json, one, sql } from "./db";

export type ManagedPage = {
  id: string;
  slug: string;
  template: CmsTemplate;
  title: string;
  published: boolean;
  sortOrder: number;
  content: CmsContent;
};

function toContent(value: unknown): CmsContent {
  const raw = json<Record<string, unknown>>(value, {});
  const out: CmsContent = {};
  for (const [key, item] of Object.entries(raw)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}

function toPage(r: Record<string, unknown>): ManagedPage {
  const template = String(r.template) as CmsTemplate;
  const slug = String(r.slug);
  return {
    id: String(r.id),
    slug,
    template,
    title: String(r.title),
    published: Boolean(r.published),
    sortOrder: Number(r.sort_order ?? 0),
    content: mergeContent(defaultContent(slug, template), toContent(r.content)),
  };
}

export async function listPages(): Promise<ManagedPage[]> {
  const rows = await sql("select * from pages order by sort_order, title");
  return rows.map(toPage);
}

export async function getPage(slug: string): Promise<ManagedPage | null> {
  const row = await one("select * from pages where slug = $1", [slug]);
  return row ? toPage(row) : null;
}

/** Public pages: a hidden row is a 404. Missing rows keep the built-in copy. */
export async function requirePageContent(slug: string): Promise<CmsContent & { title: string }> {
  const page = await getPage(slug);
  if (page && !page.published) notFound();
  const builtin = BUILTIN_PAGES.find((item) => item.slug === slug);
  const content = page?.content ?? builtin?.content ?? {};
  return { ...content, title: page?.title || builtin?.title || content.title || "" };
}

export async function unpublishedSlugs(): Promise<Set<string>> {
  const rows = await sql<{ slug: string }>("select slug from pages where published = false");
  return new Set(rows.map((row) => row.slug));
}

export async function savePage(input: { id?: string; slug: string; template: CmsTemplate; title: string; published: boolean; sortOrder: number; content: CmsContent }) {
  const slug = input.slug.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!slug || slug.includes("..")) throw new Error("رابط الصفحة غير صالح");
  if (input.id) {
    await sql(
      `update pages set slug=$2, template=$3, title=$4, published=$5, sort_order=$6, content=$7::jsonb, updated_at=now() where id=$1`,
      [input.id, slug, input.template, input.title, input.published, input.sortOrder, JSON.stringify(input.content)],
    );
    return;
  }
  await sql(
    `insert into pages (slug, template, title, published, sort_order, content)
     values ($1,$2,$3,$4,$5,$6::jsonb)
     on conflict (slug) do update set template=excluded.template, title=excluded.title, published=excluded.published,
       sort_order=excluded.sort_order, content=excluded.content, updated_at=now()`,
    [slug, input.template, input.title, input.published, input.sortOrder, JSON.stringify(input.content)],
  );
}

export async function setPagePublished(id: string, published: boolean) {
  await sql("update pages set published=$2, updated_at=now() where id=$1", [id, published]);
}

export async function deletePage(id: string) {
  const row = await one<{ slug: string }>("select slug from pages where id = $1", [id]);
  if (!row) return { ok: false as const, error: "الصفحة غير موجودة" };
  if (BUILTIN_SLUGS.has(row.slug)) {
    await setPagePublished(id, false);
    return { ok: true as const, hidden: true as const };
  }
  await sql("delete from pages where id = $1", [id]);
  return { ok: true as const, hidden: false as const };
}
