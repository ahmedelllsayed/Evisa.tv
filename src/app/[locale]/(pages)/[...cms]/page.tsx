import { notFound } from "next/navigation";
import { CmsProse } from "@/components/cms/prose-page";
import { linesOf } from "@/lib/cms/registry";
import { getPage, localizeContent } from "@/lib/data/pages";

export default async function CustomPage({ params }: { params: Promise<{ locale: string; cms: string[] }> }) {
  const { cms, locale } = await params;
  const slug = cms.join("/");
  const page = await getPage(slug);
  if (!page || !page.published) notFound();
  const content = localizeContent(page.content, locale);
  if (page.template === "prose" || page.template === "contact" || page.template === "fees") {
    return <CmsProse title={content.title || page.title} intro={content.intro} body={content.body} />;
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold">{content.title || page.title}</h1>
      {content.intro && <p className="mt-4 text-body">{content.intro}</p>}
      {content.heroBody && <p className="mt-4 text-body">{content.heroBody}</p>}
      {content.body && <p className="mt-4 whitespace-pre-wrap text-body">{content.body}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {linesOf(content.posts || content.groups || content.rows || content.systems || content.stats).map((parts) => (
          <li key={parts.join("-")} className="rounded-xl border border-line px-4 py-3">
            {parts.join(" · ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
