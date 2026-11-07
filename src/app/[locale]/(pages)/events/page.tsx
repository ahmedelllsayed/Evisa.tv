import Link from "next/link";
import { CtaBand, InfoContainer, InfoHero, infoPrimary, infoSecondary } from "@/components/info/kit";
import { EagerImage } from "@/components/social/eager-image";
import { EventsBoard, type EventFilters } from "@/components/social/events-board";
import { APPLY_BUFFER_DAYS, buildEvents, type EventView } from "@/components/social/events-model";
import { countPhrase, marketToday } from "@/components/social/format";
import { listDestinations, listEvents } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";
import { say } from "@/lib/say";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(
    locale,
    "/events",
    { en: "Events worth travelling for", ar: "فعاليات تستحق السفر" },
    {
      en: "Upcoming festivals, races and shows around the world, with the visa an Egyptian passport needs and the date to apply by.",
      ar: "مهرجانات وسباقات وعروض قادمة حول العالم، مع التأشيرة التي يحتاجها الجواز المصري وآخر موعد مناسب للتقديم.",
    },
  );
}

export default async function EventsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const [events, destinations, content, sp] = await Promise.all([listEvents(), listDestinations(), requirePageContent("events"), searchParams]);
  const today = marketToday();
  const { items, countries, months } = buildEvents(events, destinations, locale, today);
  const pick = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const initial: EventFilters = {
    country: countries.some((option) => option.value === pick("country")) ? pick("country") : "all",
    month: months.some((option) => option.value === pick("month")) ? pick("month") : "all",
  };
  const next = items[0];

  return (
    <div className="bg-white">
      <InfoHero
        kicker={content.kicker}
        title={content.title}
        intro={content.intro}
        aside={next ? <NextUp item={next} locale={locale} /> : undefined}
      >
        {items.length ? (
          <p className="mt-6 text-sm text-muted-ink">
            {countPhrase(locale, items.length, ["upcoming event", "upcoming events"], ["فعالية قادمة واحدة", "فعاليتان قادمتان", "فعاليات قادمة", "فعالية قادمة"])}
            {say(locale, " in ", " في ")}
            {countPhrase(locale, countries.length, ["country", "countries"], ["دولة واحدة", "دولتين", "دول", "دولة"])}
          </p>
        ) : null}
      </InfoHero>

      <section className="pb-12 md:pb-16">
        <InfoContainer>
          {items.length ? (
            <EventsBoard
              items={items}
              countries={countries}
              months={months}
              locale={locale}
              initial={initial}
              note={
                <>
                  <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 size-4 shrink-0 fill-current">
                    <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.9 12H9.1V9h1.8v5Zm0-6.6H9.1V5.6h1.8v1.8Z" />
                  </svg>
                  <p className="min-w-0">
                    <span className="font-semibold text-[#16182b]">{say(locale, "How the apply-by date works: ", "كيف نحسب «قدّم قبل»: ")}</span>
                    {say(
                      locale,
                      `the event date minus the usual processing time for the visa, minus a ${APPLY_BUFFER_DAYS}-day safety margin. Times are estimates, so check the visa page before you book.`,
                      `موعد الفعالية ناقص مدة المعالجة المعتادة للتأشيرة ناقص ${APPLY_BUFFER_DAYS} أيام احتياط. المدد تقديرية، فراجع صفحة التأشيرة قبل الحجز.`,
                    )}
                  </p>
                </>
              }
            />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#d6d9e8] bg-white px-6 py-14 text-center">
              <p className="text-lg font-semibold text-[#16182b]">{say(locale, "No upcoming events right now", "لا توجد فعاليات قادمة الآن")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-body">
                {say(locale, "We add new events regularly. Meanwhile, pick a destination and see its visa, fee and target date.", "نضيف فعاليات جديدة باستمرار. حتى ذلك الحين، اختر وجهتك واعرف تأشيرتها ورسومها وموعدها.")}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href={href("/", locale)} className={infoPrimary}>
                  {say(locale, "Browse destinations", "تصفّح الوجهات")}
                </Link>
                <Link href={href("/tools/visa-requirements", locale)} className={infoSecondary}>
                  {say(locale, "Check visa requirements", "افحص متطلبات التأشيرة")}
                </Link>
              </div>
            </div>
          )}
        </InfoContainer>
      </section>

      <CtaBand
        title={say(locale, "Travelling for something else?", "مسافر لسبب آخر؟")}
        body={say(locale, "Pick any destination to see the visa, the fee and the target date before you pay.", "اختر أي وجهة لتعرف التأشيرة والرسوم والموعد المستهدف قبل الدفع.")}
        actions={
          <Link href={href("/", locale)} className="inline-flex h-11 items-center justify-center rounded-full bg-[#ffd873] px-5 text-sm font-semibold text-black hover:bg-[#ffcf4d]">
            {say(locale, "Find your visa", "ابحث عن تأشيرتك")}
          </Link>
        }
      />
    </div>
  );
}

function NextUp({ item, locale }: { item: EventView; locale: string }) {
  return (
    <a href={`#event-${item.id}`} className="group block overflow-hidden rounded-[22px] border border-[#e3e5f2] bg-white shadow-[0_18px_40px_-28px_rgba(22,24,43,0.45)]">
      <div className="relative aspect-[16/9] bg-[#eef0f8]">
        {item.image ? <EagerImage src={item.image} alt="" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 420px, 100vw" /> : null}
        <span className="absolute start-3 top-3 rounded-full bg-[#16182b] px-3 py-1 text-xs font-semibold text-white">{say(locale, "Next up", "الأقرب")}</span>
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold text-brand-700">{item.countdown}</p>
        <p className="mt-1 text-lg leading-snug font-semibold text-[#16182b]">
          <bdi>{item.name}</bdi>
        </p>
        <p className="mt-1 text-sm text-muted-ink">
          <bdi>{item.city}</bdi>
          {say(locale, ", ", "، ")}
          {item.country} · {item.dateLabel}
        </p>
      </div>
    </a>
  );
}
