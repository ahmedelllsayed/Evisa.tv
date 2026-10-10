import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { StarRow } from "@/components/brand/icons";
import { listReviews } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { localizeReview } from "@/lib/localize";
import { initials } from "@/lib/visa";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/wall-of-love", { en: "Wall of Love", ar: "آراء العملاء" });
}

export default async function WallOfLovePage({ params }: Page) {
  const { locale } = await params;
  const [reviews, content] = await Promise.all([listReviews("wall"), requirePageContent("wall-of-love")]);
  return (
    <div className="bg-[#111] text-white">
      <header className="px-4 pt-16 pb-10 text-center">
        <h1 className="mx-auto w-fit font-sans text-3xl font-bold tracking-tight md:text-5xl">{content.title}</h1>
      </header>
      <div className="mx-auto columns-1 gap-4 px-4 pb-20 sm:columns-2 lg:max-w-6xl lg:columns-3">
        {reviews.map((item, i) => {
          const r = localizeReview(item, locale);
          return (
          <figure
            key={r.id}
            className={`mb-4 break-inside-avoid rounded-2xl border p-4 ${i % 5 === 0 ? "border-white/15 bg-white text-ink" : "border-white/10 bg-white/8"}`}
          >
            <StarRow rating={r.rating} />
            {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
            <blockquote className={`mt-2 text-sm leading-relaxed ${i % 5 === 0 ? "text-body" : "text-white/75"}`}>{r.body}</blockquote>
            <figcaption className="mt-4 flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
                  {initials(r.author)}
                </span>
                {r.author}
              </span>
              <time className={i % 5 === 0 ? "text-muted-ink" : "text-white/40"}>
                {new Date(r.publishedAt).toLocaleDateString(locale, { month: "short", year: "numeric" })}
              </time>
            </figcaption>
          </figure>
          );
        })}
      </div>
    </div>
  );
}
