import Link from "next/link";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { RejectionGuide, type GuideDestination, type GuideReason } from "@/components/help/rejection-guide";
import { reasonExtra } from "@/components/help/reason-copy";
import { normalizeSearch } from "@/components/help/search-text";
import { Callout, CtaBand, InfoHero, InfoSection, ProseArticle, StatGrid, Steps, infoOnDark, infoPrimary, infoSecondary } from "@/components/info/kit";
import { RejectionPicker } from "@/components/tools/rejection-picker";
import { countryName, flagUrl } from "@/lib/countries";
import { listDestinations } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { regionOptions } from "@/lib/destination-fields";
import { href, visaHref } from "@/lib/href";
import { isArabicLocale } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import { say } from "@/lib/say";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/rejection-recovery", { en: "Visa rejection notes", ar: "ملاحظات رفض التأشيرة" });
}

function afterRefusal(locale: string) {
  return [
    {
      title: say(locale, "Read the refusal letter", "اقرأ رسالة الرفض"),
      body: say(locale, "The authority's letter or email usually names the reason. Keep a copy of it.", "رسالة الجهة أو بريدها يذكر السبب غالباً. احتفظ بنسخة منها."),
    },
    {
      title: say(locale, "Fix the cause", "أصلح السبب"),
      body: say(
        locale,
        "Renew the passport, replace the weak document or correct the details that led to the refusal.",
        "جدّد الجواز، أو استبدل المستند الناقص، أو صحّح البيانات التي أدت إلى الرفض.",
      ),
    },
    {
      title: say(locale, "Apply again when ready", "قدّم من جديد عندما تجهز"),
      body: say(
        locale,
        "Some countries set a waiting period. Check the visa page, then start a new application.",
        "بعض الدول تشترط مدة انتظار. راجع صفحة التأشيرة ثم ابدأ طلباً جديداً.",
      ),
    },
  ];
}

export default async function RejectionRecoveryPage({ params }: Page) {
  const { locale } = await params;
  const [content, destinations] = await Promise.all([requirePageContent("rejection-recovery"), listDestinations()]);
  const arabic = isArabicLocale(locale);
  const contactHref = href("/contact?topic=documents", locale);
  const covered = destinations.filter((d) => d.rejectionReasons.length > 0);

  const ending = (
    <>
      <InfoSection
        title={say(locale, "After a refusal", "بعد الرفض")}
        hint={say(locale, "A refusal is not always final. These steps help most travellers.", "الرفض ليس نهائياً دائماً. هذه الخطوات تفيد أغلب المسافرين.")}
      >
        <Steps items={afterRefusal(locale)} />
        <Callout
          accent="amber"
          className="mt-4"
          title={say(locale, "Paid for an application that was refused?", "دفعت مقابل طلب رُفض؟")}
          action={
            <Link href={href("/transparency/refunds-policy", locale)} className={infoSecondary}>
              {say(locale, "Refunds policy", "سياسة الاسترداد")}
            </Link>
          }
        >
          {say(locale, "What comes back depends on how far the application went.", "المبلغ المسترد يعتمد على المرحلة التي وصل إليها الطلب.")}
        </Callout>
      </InfoSection>
      {content.body ? <ProseArticle locale={locale} body={content.body} /> : null}
      <CtaBand
        title={say(locale, "Applying again?", "ستقدّم من جديد؟")}
        body={say(
          locale,
          "Send the destination and the reason on the refusal letter. A staff member reads every message and replies by email.",
          "أرسل اسم الوجهة والسبب المذكور في رسالة الرفض. يقرأ أحد أفراد الفريق كل رسالة ويرد بالبريد.",
        )}
        actions={
          <>
            <Link href={contactHref} className={infoOnDark}>
              {say(locale, "Ask the team", "اسأل الفريق")}
            </Link>
            <Link href={href("/tools/visa-requirements", locale)} className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
              {say(locale, "Check requirements", "راجع المتطلبات")}
            </Link>
          </>
        }
      />
    </>
  );

  if (!covered.length) {
    const options = destinations
      .filter((d) => d.visaRequired)
      .map((d) => ({ slug: d.slug, name: localizedDestinationName(d, locale) }));
    return (
      <>
        <InfoHero kicker={say(locale, "Rejection notes", "ملاحظات الرفض")} title={content.title} intro={content.intro} />
        <InfoSection>
          <RejectionPicker locale={locale} destinations={options} />
        </InfoSection>
        {ending}
      </>
    );
  }

  const reasons: Record<string, GuideReason> = {};
  const regionsAr: Record<string, string> = { ...Object.fromEntries(regionOptions.map((r) => [r.value, r.label])), Americas: "الأمريكتان" };
  const regionLabel = (value: string | null) => (value ? (arabic ? (regionsAr[value] ?? value) : value) : null);
  const guide: GuideDestination[] = covered.map((d) => {
    const keys: string[] = [];
    const words: string[] = [];
    for (const reason of d.rejectionReasons) {
      const key = `${normalizeSearch(reason.title)}|${normalizeSearch(reason.body ?? "")}`;
      if (keys.includes(key)) continue;
      keys.push(key);
      const extra = reasonExtra(reason.title);
      const titleAr = reason.titleAr || extra?.titleAr || "";
      const bodyAr = reason.bodyAr || (extra && !reason.titleAr ? extra.bodyAr : "");
      words.push(reason.title, titleAr, reason.body ?? "", bodyAr);
      const entry = reasons[key];
      if (entry) entry.count += 1;
      else
        reasons[key] = {
          key,
          title: (arabic && titleAr) || reason.title,
          body: (arabic && bodyAr) || reason.body || "",
          tip: extra ? (arabic ? extra.tipAr : extra.tipEn) : "",
          count: 1,
        };
    }
    const regionAr = d.region ? (regionsAr[d.region] ?? "") : "";
    return {
      id: d.id,
      name: localizedDestinationName(d, locale),
      region: d.region,
      regionLabel: regionLabel(d.region),
      flag: d.flag || flagUrl(d.code, 80),
      href: visaHref(d.slug, locale),
      reasonKeys: keys,
      searchText: [d.name, d.nameAr ?? "", countryName(d.code, "ar"), countryName(d.code, "en"), d.code, d.slug, d.region ?? "", regionAr, ...words].join(" "),
    };
  });
  const common = Object.values(reasons)
    .filter((r) => r.count > 1)
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 6)
    .map((r) => r.key);
  const present = new Set(covered.map((d) => d.region).filter(Boolean));
  const regions = [...regionOptions.map((r) => r.value), "Americas"]
    .filter((value) => present.has(value))
    .map((value) => ({ value, label: regionLabel(value) ?? value }));
  const reasonCount = Object.keys(reasons).length;

  return (
    <>
      <InfoHero
        kicker={say(locale, "Rejection notes", "ملاحظات الرفض")}
        title={content.title}
        intro={content.intro}
        actions={
          <>
            <a href="#guide" className={infoPrimary}>
              {say(locale, "Find your destination", "ابحث عن وجهتك")}
            </a>
            <Link href={contactHref} className={infoSecondary}>
              {say(locale, "Ask about your file", "اسأل عن ملفك")}
            </Link>
          </>
        }
        aside={
          <StatGrid
            items={[
              { value: covered.length, label: say(locale, "Destinations with notes", "وجهات لها ملاحظات") },
              { value: reasonCount, label: say(locale, "Different reasons listed", "أسباب مختلفة مذكورة") },
            ]}
          />
        }
      />
      <InfoSection>
        <RejectionGuide locale={locale} reasons={reasons} common={common} destinations={guide} regions={regions} contactHref={contactHref} />
      </InfoSection>
      {ending}
    </>
  );
}
