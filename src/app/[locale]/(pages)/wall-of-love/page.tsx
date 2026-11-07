import Link from "next/link";
import { InfoContainer, InfoHero, infoOnDark } from "@/components/info/kit";
import { countPhrase } from "@/components/social/format";
import { Stars } from "@/components/social/stars";
import { WallBoard } from "@/components/social/wall-board";
import { defaultWallFilters, type WallFilters } from "@/components/social/wall-filters";
import { buildWall, type WallStats } from "@/components/social/wall-model";
import { listDestinations, listReviews } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { href } from "@/lib/href";
import type { Page, SearchParams } from "@/lib/page";
import { say } from "@/lib/say";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(
    locale,
    "/wall-of-love",
    { en: "Wall of Love", ar: "آراء المسافرين" },
    {
      en: "Reviews from travellers who got their visa with us, with ratings, verified marks and the visa they applied for.",
      ar: "آراء مسافرين استلموا تأشيراتهم معنا، مع التقييم وعلامة التوثيق ونوع التأشيرة.",
    },
  );
}

const ghost = "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-white/50";

function readFilters(sp: SearchParams, visaKeys: Set<string>): WallFilters {
  const pick = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const rating = pick("rating");
  const lang = pick("lang");
  const visa = pick("visa");
  return {
    rating: rating === "5" || rating === "4" || rating === "3" ? rating : defaultWallFilters.rating,
    visa: visaKeys.has(visa) ? visa : "all",
    verified: pick("verified") === "1",
    lang: lang === "ar" || lang === "en" ? lang : "all",
    sort: pick("sort") === "top" ? "top" : "newest",
    examples: pick("examples") !== "0",
  };
}

export default async function WallOfLovePage({ params, searchParams }: Page) {
  const { locale } = await params;
  const [reviews, destinations, content, sp] = await Promise.all([listReviews("wall"), listDestinations(), requirePageContent("wall-of-love"), searchParams]);
  const { items, stats } = buildWall(reviews, destinations, locale);
  const initial = readFilters(sp, new Set(items.flatMap((item) => (item.visaKey ? [item.visaKey] : []))));
  const onlyExamples = items.length > 0 && !stats;

  return (
    <div className="bg-black text-white">
      <InfoHero
        tone="dark"
        kicker={content.kicker}
        title={content.title}
        intro={content.intro}
        actions={
          <>
            <Link href={href("/", locale)} className={infoOnDark}>
              {say(locale, "Find your visa", "ابحث عن تأشيرتك")}
            </Link>
            <Link href={href("/contact", locale)} className={ghost}>
              {say(locale, "Share your experience", "شارك تجربتك")}
            </Link>
          </>
        }
        aside={stats ? <RatingSummary stats={stats} locale={locale} /> : onlyExamples ? <ExamplesNotice locale={locale} /> : null}
      />

      <section className="pb-16 md:pb-20">
        <InfoContainer>
          <WallBoard items={items} locale={locale} initial={initial} />
          <p className="mt-10 max-w-3xl text-xs leading-relaxed text-white/45">
            {say(
              locale,
              "How we publish reviews: we show them as written and do not edit the rating. A verified mark means we matched the review to a real application. Examples are labelled and excluded from the average and the count.",
              "كيف ننشر الآراء: نعرضها كما كُتبت ولا نعدّل التقييم. علامة «موثّق» تعني أننا طابقنا الرأي مع طلب حقيقي. الأمثلة عليها علامة ولا تدخل في المتوسط أو العدد.",
            )}{" "}
            <Link href={href("/editorial-policy", locale)} className="text-white/70 underline underline-offset-2 hover:text-white">
              {say(locale, "Editorial policy", "السياسة التحريرية")}
            </Link>
          </p>
        </InfoContainer>
      </section>

      <section className="border-t border-white/10 py-12 md:py-16">
        <InfoContainer className="flex min-w-0 flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{content.ctaTitle}</h2>
            {content.ctaBody ? <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">{content.ctaBody}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href={href("/", locale)} className={infoOnDark}>
              {say(locale, "Start an application", "ابدأ طلبك")}
            </Link>
            <Link href={href("/account", locale)} className={ghost}>
              {say(locale, "Track my application", "تابع طلبي")}
            </Link>
          </div>
        </InfoContainer>
      </section>
    </div>
  );
}

function RatingSummary({ stats, locale }: { stats: WallStats; locale: string }) {
  const max = Math.max(...stats.distribution.map((row) => row.count), 1);
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-6">
      <div className="flex items-end gap-4">
        <p className="text-5xl leading-none font-semibold tabular-nums">{stats.average}</p>
        <div className="min-w-0 pb-1">
          <Stars rating={Math.round(Number(stats.average))} locale={locale} />
          <p className="mt-1 text-sm text-white/60">
            {say(locale, "from ", "من ")}
            {countPhrase(locale, stats.count, ["review", "reviews"], ["رأي واحد", "رأيين", "آراء", "رأياً"])}
          </p>
        </div>
      </div>
      <dl className="mt-5 space-y-1.5">
        {stats.distribution.map((row) => (
          <div key={row.stars} className="flex items-center gap-3 text-xs text-white/60">
            <dt className="flex w-8 shrink-0 items-center gap-1 tabular-nums">
              {row.stars}
              <svg viewBox="0 0 24 24" className="size-3 fill-[#ffd873]" aria-label={say(locale, "stars", "نجوم")}>
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </dt>
            <dd className="flex min-w-0 flex-1 items-center gap-3">
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-[#ffd873]" style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <span className="w-6 shrink-0 text-end tabular-nums">{row.count}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/50">
        {stats.verified > 0
          ? say(locale, `${stats.verified} verified. `, `${stats.verified} منها موثّقة. `)
          : null}
        {stats.latest ? say(locale, `Latest review ${stats.latest}. `, `آخر رأي ${stats.latest}. `) : null}
        {say(locale, "Examples are not counted.", "الأمثلة لا تُحتسب.")}
      </p>
    </div>
  );
}

function ExamplesNotice({ locale }: { locale: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-amber-300/30 bg-amber-300/[0.06] p-6">
      <p className="font-semibold text-amber-100">{say(locale, "These are examples for now", "المعروض الآن أمثلة")}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/65">
        {say(
          locale,
          "Every review on this page is an illustrative example. We will show an average rating once real customers share their reviews.",
          "كل الآراء في هذه الصفحة أمثلة توضيحية. سنعرض متوسط التقييم عندما ينشر عملاؤنا آراءهم.",
        )}
      </p>
    </div>
  );
}
