import Link from "next/link";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Callout, InfoCard, InfoHero, InfoSection, StatGrid, TrustNav, infoSecondary } from "@/components/info/kit";
import { FeeAudit, type FeeAuditItem } from "@/components/trust/fee-audit";
import { formatCount, formatPercent } from "@/components/trust/format";
import { requirePageContent } from "@/lib/data/pages";
import { listFeeAudit } from "@/lib/data/trust";
import { href, visaHref } from "@/lib/href";
import { isArabicLocale, t } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import { say } from "@/lib/say";
import { formatDate, formatMoney } from "@/lib/visa";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/transparency/price-change-log", { en: "Fee Change Audit", ar: "سجل الرسوم" });
}

export default async function FeeChangePage({ params }: Page) {
  const { locale } = await params;
  const [changes, content] = await Promise.all([listFeeAudit(), requirePageContent("transparency/price-change-log")]);
  const arabic = isArabicLocale(locale);

  const items: FeeAuditItem[] = changes.map((change) => {
    const delta = change.newTotal - change.oldTotal;
    const direction = delta > 0 ? "up" : delta < 0 ? "down" : "same";
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
    return {
      id: change.id,
      date: formatDate(change.changedAt, locale),
      destinationKey: change.destinationId,
      destination: localizedDestinationName({ name: change.destinationName, nameAr: change.destinationNameAr, code: change.destinationCode }, locale),
      option: (arabic ? change.optionLabelAr || change.optionLabel : change.optionLabel) || null,
      link: change.destinationActive ? visaHref(change.destinationSlug, locale) : null,
      before: formatMoney(change.oldTotal, change.currency, locale),
      after: formatMoney(change.newTotal, change.currency, locale),
      difference: `${sign}${formatMoney(Math.abs(delta), change.currency, locale)}`,
      percent: change.oldTotal > 0 && delta !== 0 ? formatPercent(locale, delta / change.oldTotal, { signed: true, moneyDigits: true }) : null,
      direction,
      reason: change.reason,
    };
  });

  const destinations = [...new Map(items.map((item) => [item.destinationKey, item.destination])).entries()]
    .map(([key, label]) => ({ key, label, count: items.filter((item) => item.destinationKey === key).length }))
    .sort((a, b) => a.label.localeCompare(b.label, arabic ? "ar" : "en"));
  const increases = items.filter((item) => item.direction === "up").length;
  const decreases = items.filter((item) => item.direction === "down").length;
  const last = changes[0];

  return (
    <>
      <InfoHero kicker={say(locale, "Transparency", "الشفافية")} title={content.title} intro={content.intro} />

      {items.length ? (
        <>
          <InfoSection className="pt-0 md:pt-0">
            <StatGrid
              items={[
                { value: formatCount(locale, items.length), label: say(locale, "Recorded changes", "تغييرات مسجّلة") },
                { value: formatCount(locale, increases), label: say(locale, "Increases", "زيادات") },
                { value: formatCount(locale, decreases), label: say(locale, "Decreases", "تخفيضات") },
                {
                  value: <span className="text-xl md:text-2xl">{last ? formatDate(last.changedAt, locale) : "—"}</span>,
                  label: say(locale, "Last change", "آخر تغيير"),
                },
              ]}
            />
          </InfoSection>
          <InfoSection title={say(locale, "Change log", "سجل التغييرات")} hint={say(locale, "Newest first. Each total is for one traveller.", "الأحدث أولاً. كل إجمالي لمسافر واحد.")} className="pt-0 md:pt-0">
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <FeeAudit
                items={items}
                destinations={destinations}
                copy={{
                  destination: t(locale, "fees.destination"),
                  allDestinations: say(locale, "All destinations", "كل الوجهات"),
                  direction: say(locale, "Change type", "نوع التغيير"),
                  all: say(locale, "All", "الكل"),
                  increases: say(locale, "Increases", "زيادات"),
                  decreases: say(locale, "Decreases", "تخفيضات"),
                  showing: say(locale, "Showing {shown} of {total} changes", "التغييرات المعروضة: {shown} من {total}"),
                  before: t(locale, "fees.was"),
                  after: t(locale, "fees.now"),
                  reason: t(locale, "fees.reason"),
                  noReason: say(locale, "No reason recorded", "لم يُسجَّل سبب"),
                  noMatch: say(locale, "No changes match these filters.", "لا توجد تغييرات تطابق هذا الاختيار."),
                  reset: say(locale, "Show all changes", "اعرض كل التغييرات"),
                  visaPage: say(locale, "Open the visa page", "افتح صفحة التأشيرة"),
                  rtl: arabic,
                }}
              />
              <FeeNotes locale={locale} note={content.note} />
            </div>
          </InfoSection>
        </>
      ) : (
        <InfoSection className="pt-0 md:pt-0">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <InfoCard className="border-dashed text-center">
              <p className="font-semibold text-[#16182b]">{t(locale, "fees.empty")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-body">
                {say(locale, "When an editor changes a fee, the old and new totals appear here with the date and the reason.", "عندما يغيّر المحرر رسماً، يظهر هنا الإجمالي القديم والجديد مع التاريخ والسبب.")}
              </p>
              <Link href={href("/", locale)} className={`${infoSecondary} mt-5`}>
                {say(locale, "See current fees", "اعرض الرسوم الحالية")}
              </Link>
            </InfoCard>
            <FeeNotes locale={locale} note={content.note} />
          </div>
        </InfoSection>
      )}
      <TrustNav locale={locale} current="/transparency/price-change-log" />
    </>
  );
}

function FeeNotes({ locale, note }: { locale: string; note?: string }) {
  return (
    <aside className="grid min-w-0 gap-3 lg:sticky lg:top-24">
      {note ? (
        <Callout title={say(locale, "How totals work", "كيف يُحسب الإجمالي")}>
          <p>{note}</p>
        </Callout>
      ) : null}
      <Callout accent="slate" title={say(locale, "Where reasons come from", "مصدر الأسباب")}>
        <p>{say(locale, "Each reason is written by the editor who made the change and is shown as entered.", "يكتب المحرر الذي غيّر الرسم السبب، ويظهر كما كُتب.")}</p>
      </Callout>
      <Link href={href("/editorial-policy", locale)} className="px-1 text-sm font-semibold text-brand-700 hover:underline">
        {say(locale, "Read the editorial policy", "اقرأ السياسة التحريرية")}
      </Link>
    </aside>
  );
}
