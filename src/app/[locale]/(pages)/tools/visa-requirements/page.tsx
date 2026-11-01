import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RequirementsChecker } from "@/components/tools/requirements-checker";
import { listDestinations } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { getCitizenship } from "@/lib/preferences";
import type { Destination } from "@/lib/types";
import { isArabicLocale } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import { visaTypeLabel } from "@/lib/visa";

function copy(ar: boolean) {
  if (!ar) {
    return {
      countries: "Countries covered",
      daily: "Daily",
      dailyBody: "Refreshed from official sources",
      free: "Free",
      freeBody: "No signup, no card",
      seconds: "5 sec",
      secondsBody: "Answer time",
      steps: "1 Pick passport · 2 Pick destination · 3 See the requirement",
      rulesKicker: "01 — ENTRY RULES",
      rulesTitle: "The four kinds of visa rules",
      apply: "Apply",
      processing: "Processing",
      fee: "Typical fee",
      trendKicker: "02 — TRENDING",
      trendTitle: "Popular this week",
      timeKicker: "03 — HOW LONG IT TAKES",
      timeTitle: "Processing times at a glance",
      policyKicker: "04 — POLICY CHANGES",
      policyTitle: "Recent policy updates",
      noSource: "No official source is stored for this destination yet.",
      avoidKicker: "05 — AVOID THESE",
      avoidTitle: "Common mistakes that delay travel",
      faqKicker: "06 — ANSWERS",
      faqTitle: "Frequently asked questions",
      kinds: [
        ["Visa-free", "Show your passport and walk in.", "No application", "Instant at the border", "Free"],
        ["Visa on arrival", "Collect the visa at the airport or land border.", "No advance form", "Same day", "A small border fee"],
        ["e-Visa", "Apply online before you fly.", "1–7 days ahead", "A few days", "Government fee plus service"],
        ["Embassy visa", "Full application, often with an appointment.", "Weeks ahead", "2–8 weeks", "Higher consular fee"],
      ],
      speeds: [
        ["Instant", "Same day", "Visa-free entry or a stamp at the airport."],
        ["Fast", "1–3 days", "Short applications filed a few days before departure."],
        ["Standard", "3–10 days", "Online visas with a short review."],
        ["Plan ahead", "Over 10 days", "Applications that need more lead time."],
      ],
      mistakes: [
        ["Validity", "Passport expires within six months", "Most destinations want six months of validity left on the day you enter."],
        ["Transit", "Forgetting the transit visa", "A layover in the UK, US, China or Schengen can still need its own permission."],
        ["Residence", "Mixing residence and nationality", "Some rules follow where you live, not only the passport you hold."],
        ["Photos", "Wrong photo specs", "Background, glasses and head size are the usual reasons a photo is sent back."],
        ["Funds", "Thin bank statements", "Embassies often ask for several months of steady balances."],
        ["Stay limits", "Overstaying a visa-free entry", "Visa-free is a counted stay, often 30, 60 or 90 days."],
      ],
      faqs: [
        ["Do I need a visa to travel?", "It depends on the passport and the destination. Use the checker for visa-free, visa on arrival, e-visa, or embassy."],
        ["What is the difference between visa-free and visa on arrival?", "Visa-free means no visa at all. Visa on arrival means you are issued one when you land."],
        ["What is an e-visa?", "A visa you apply for online. It is stored against your passport number rather than stuck in the booklet."],
        ["Do requirements change?", "Yes. Check again close to the travel date, even if you looked the route up before."],
        ["Is this checker free?", "Yes. No account and no card."],
      ],
    };
  }
  return {
    countries: "دول مغطاة",
    daily: "يومياً",
    dailyBody: "يُحدَّث من مصادر رسمية",
    free: "مجاناً",
    freeBody: "بدون حساب وبدون بطاقة",
    seconds: "5 ثوانٍ",
    secondsBody: "وقت الإجابة",
    steps: "1 اختر الجواز · 2 اختر الوجهة · 3 اعرف المتطلب",
    rulesKicker: "01 — قواعد الدخول",
    rulesTitle: "أربعة أنواع من قواعد التأشيرة",
    apply: "التقديم",
    processing: "المعالجة",
    fee: "الرسم المعتاد",
    trendKicker: "02 — الرائج",
    trendTitle: "الأكثر طلباً هذا الأسبوع",
    timeKicker: "03 — كم تستغرق",
    timeTitle: "مدد المعالجة باختصار",
    policyKicker: "04 — تحديثات السياسة",
    policyTitle: "آخر تحديثات القواعد",
    noSource: "لا يوجد مصدر رسمي محفوظ لهذه الوجهة بعد.",
    avoidKicker: "05 — تجنّب هذا",
    avoidTitle: "أخطاء شائعة تؤخر السفر",
    faqKicker: "06 — إجابات",
    faqTitle: "أسئلة شائعة",
    kinds: [
      ["بدون تأشيرة", "أبرز جوازك وادخل.", "بدون طلب", "فوراً على الحدود", "مجاناً"],
      ["تأشيرة عند الوصول", "تُستلم في المطار أو المعبر البري.", "بدون نموذج مسبق", "في اليوم نفسه", "رسم حدودي بسيط"],
      ["تأشيرة إلكترونية", "قدّم عبر الإنترنت قبل السفر.", "قبلها بيوم إلى 7 أيام", "بضعة أيام", "رسم الجهة مع الخدمة"],
      ["تأشيرة سفارة", "طلب كامل، وغالباً بموعد.", "قبلها بأسابيع", "من أسبوعين إلى 8", "رسم قنصلي أعلى"],
    ],
    speeds: [
      ["فوري", "اليوم نفسه", "دخول بدون تأشيرة أو ختم في المطار."],
      ["سريع", "1–3 أيام", "طلبات قصيرة تُجهَّز قبل السفر بأيام."],
      ["عادي", "3–10 أيام", "تأشيرات إلكترونية بمراجعة قصيرة."],
      ["خطّط مبكراً", "أكثر من 10 أيام", "طلبات تحتاج وقتاً أطول."],
    ],
    mistakes: [
      ["الصلاحية", "الجواز ينتهي خلال ستة أشهر", "أغلب الوجهات تطلب ستة أشهر صلاحية متبقية يوم الدخول."],
      ["الترانزيت", "نسيان تأشيرة العبور", "توقف في بريطانيا أو أمريكا أو الصين أو شنغن قد يحتاج إذناً خاصاً."],
      ["الإقامة", "خلط الإقامة بالجنسية", "بعض القواعد تتبع مكان إقامتك لا الجواز فقط."],
      ["الصور", "مواصفات صورة خاطئة", "الخلفية والنظارات وحجم الرأس أكثر أسباب إعادة الصورة."],
      ["الأموال", "كشف حساب ضعيف", "السفارات تطلب غالباً أرصدة مستقرة لعدة أشهر."],
      ["مدة الإقامة", "تجاوز الدخول بدون تأشيرة", "الإعفاء مدة محسوبة، غالباً 30 أو 60 أو 90 يوماً."],
    ],
    faqs: [
      ["هل أحتاج تأشيرة للسفر؟", "يعتمد على الجواز والوجهة. استخدم الفحص لتعرف: بدون تأشيرة، عند الوصول، إلكترونية، أو سفارة."],
      ["ما الفرق بين بدون تأشيرة وعند الوصول؟", "بدون تأشيرة يعني لا توجد تأشيرة. عند الوصول تُصدر لك حين تهبط."],
      ["ما التأشيرة الإلكترونية؟", "تأشيرة تطلبها عبر الإنترنت. تُربط برقم الجواز ولا تُلصق في الدفتر."],
      ["هل تتغير المتطلبات؟", "نعم. راجعها قرب موعد السفر حتى لو فحصت الطريق من قبل."],
      ["هل الفحص مجاني؟", "نعم. بدون حساب وبدون بطاقة."],
    ],
  };
}

const speedMatch = [
  (d: Destination) => !d.visaRequired || (d.processingHours ?? 999) < 24,
  (d: Destination) => d.visaRequired && (d.processingHours ?? 0) >= 24 && (d.processingHours ?? 0) <= 72,
  (d: Destination) => d.visaRequired && (d.processingHours ?? 0) > 72 && (d.processingHours ?? 0) <= 240,
  (d: Destination) => d.visaRequired && (d.processingHours ?? 0) > 240,
];

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/tools/visa-requirements", { en: "Visa Requirements Checker", ar: "فحص متطلبات التأشيرة" });
}

export default async function VisaRequirementsPage({ params }: Page) {
  const { locale } = await params;
  const c = copy(isArabicLocale(locale));
  const [destinations, content, passport] = await Promise.all([
    listDestinations(),
    requirePageContent("tools/visa-requirements"),
    getCitizenship(),
  ]);
  return (
    <div className="bg-[#f6f7fb]">
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">{content.kicker}</p>
        <h1 className="font-serif mt-3 text-5xl font-medium md:text-6xl">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-body">{content.intro}</p>
        <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            [String(destinations.length), c.countries],
            [c.daily, c.dailyBody],
            [c.free, c.freeBody],
            [c.seconds, c.secondsBody],
          ].map(([n, l]) => (
            <div key={l}>
              <dt className="font-display text-2xl font-semibold">{n}</dt>
              <dd className="text-[11px] tracking-wide text-muted-ink uppercase">{l}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-xs text-muted-ink">{c.steps}</p>
        <RequirementsChecker destinations={destinations} locale={locale} passport={passport} />
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">{c.rulesKicker}</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">{c.rulesTitle}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {c.kinds.map(([title, body, apply, time, fee]) => (
            <article key={title} className="rounded-3xl bg-white p-5">
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-body">{body}</p>
              <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div><dt className="text-muted-ink">{c.apply}</dt><dd className="font-medium">{apply}</dd></div>
                <div><dt className="text-muted-ink">{c.processing}</dt><dd className="font-medium">{time}</dd></div>
                <div><dt className="text-muted-ink">{c.fee}</dt><dd className="font-medium">{fee}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">{c.trendKicker}</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">{c.trendTitle}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.slice(0, 12).map((destination) => (
            <div key={destination.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3">
              <span className="min-w-0 font-medium">{localizedDestinationName(destination, locale)}</span>
              <span className="text-xs tracking-wide text-muted-ink uppercase">{visaTypeLabel(destination.visaType, locale)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">{c.timeKicker}</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">{c.timeTitle}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {c.speeds.map(([title, time, body], index) => (
            <article key={title} className="rounded-3xl bg-white p-5">
              <p className="text-xs font-semibold tracking-widest text-brand uppercase">{title}</p>
              <p className="mt-2 font-display text-xl font-semibold">{time}</p>
              <p className="mt-2 text-sm text-body">{body}</p>
              <p className="mt-3 text-xs text-muted-ink">
                {destinations.filter(speedMatch[index]).slice(0, 4).map((destination) => localizedDestinationName(destination, locale)).join(", ") || "—"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">{c.policyKicker}</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">{c.policyTitle}</h2>
        <ul className="mt-6 space-y-4">
          {destinations.slice(0, 6).map((destination) => {
            const source = destination.sources.find((item) => /^https?:\/\//.test(item.url));
            return (
              <li key={destination.id} className="rounded-2xl bg-white p-4">
                <p className="text-xs text-muted-ink">{visaTypeLabel(destination.visaType, locale)} · {localizedDestinationName(destination, locale)}</p>
                {source ? (
                  <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-brand">
                    {source.label}
                  </a>
                ) : (
                  <p className="mt-1 text-sm">{c.noSource}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-[#111] px-4 py-14 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-white/50">{c.avoidKicker}</p>
          <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">{c.avoidTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {c.mistakes.map(([k, title, body]) => (
              <article key={k} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-[11px] tracking-[0.16em] text-white/40">{k}</p>
                <h3 className="mt-2 font-medium">{title}</h3>
                <p className="mt-2 text-sm text-white/65">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">{c.faqKicker}</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">{c.faqTitle}</h2>
        <Accordion className="mt-4">
          {c.faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
