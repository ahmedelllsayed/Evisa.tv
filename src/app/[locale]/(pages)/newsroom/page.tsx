import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import Link from "next/link";
import { linesOf } from "@/lib/cms/registry";
import { getSiteSettings } from "@/lib/data/settings";
import { requirePageContent } from "@/lib/data/pages";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/newsroom", { en: "Newsroom", ar: "الأخبار" });
}

export default async function NewsroomPage({ params }: Page) {
  const { locale } = await params;
  const [content, settings] = await Promise.all([requirePageContent("newsroom"), getSiteSettings()]);
  const posts = linesOf(content.posts).map((parts) => ({
    date: parts[0] ?? "",
    source: parts[1] ?? "",
    title: parts.slice(2).join(" | "),
  }));
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <p className="text-sm text-muted-ink">
        <Link href={href("/", locale)} className="hover:text-ink">{t(locale, "nav.home")}</Link>
        <span className="mx-2">&gt;</span>
        <span>{t(locale, "footer.newsroom")}</span>
      </p>
      <h1 className="mt-6 font-sans text-4xl font-semibold tracking-tight">{content.title}</h1>
      <h2 className="mt-4 text-2xl font-semibold">{content.subtitle}</h2>
      <p className="mt-2 text-sm text-muted-ink">
        Email: <a href={`mailto:${settings.pressEmail}`} className="underline">{settings.pressEmail}</a>
      </p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {posts.map((post) => (
          <li key={post.title} className="grid grid-cols-1 items-start gap-1 py-5 text-sm md:grid-cols-[110px_1fr_160px] md:items-center md:gap-4">
            <span className="text-muted-ink">{post.date}</span>
            <span className="font-medium">{post.title}</span>
            <span className="text-muted-ink md:text-end">{post.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
