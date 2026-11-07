import Link from "next/link";
import type { ReactNode } from "react";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Badge, CtaBand, FaqList, InfoCard, InfoHero, InfoSection, Steps, TrustNav, infoOnDark, infoPrimary, infoSecondary } from "@/components/info/kit";
import { refundFaqItems } from "@/components/trust/refund-faq";
import { RefundStagePicker, type PickerCopy } from "@/components/trust/refund-stage-picker";
import { refundStages } from "@/components/trust/refund-stages";
import { verdictTone, type RefundVerdict } from "@/components/trust/verdict";
import { listFaqs, listReviews } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { href } from "@/lib/href";
import { isArabicLocale, t } from "@/lib/i18n";
import { localizeReview } from "@/lib/localize";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";
import { formatDate, initials } from "@/lib/visa";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/transparency/refunds-policy", { en: "Refunds Policy", ar: "سياسة الاسترداد" });
}

function verdictCopy(locale: string): PickerCopy["verdicts"] {
  return {
    yes: { title: say(locale, "You can request a refund", "يمكنك طلب الاسترداد"), body: say(locale, "Send the request from your account. A staff member approves it before any money is sent back.", "أرسل الطلب من حسابك. يوافق عليه موظف قبل إعادة أي مبلغ.") },
    review: { title: say(locale, "You can ask for a review", "يمكنك طلب مراجعة"), body: say(locale, "There is no automatic refund at this stage. Send your reason from your account and the team decides.", "لا يوجد استرداد تلقائي في هذه المرحلة. أرسل سببك من حسابك والفريق يقرر.") },
    no: { title: say(locale, "No refund at this stage", "لا استرداد في هذه المرحلة"), body: say(locale, "The service has been delivered. Contact support if something is wrong with the file.", "اكتملت الخدمة. تواصل مع الدعم إذا كان في الملف خطأ.") },
    none: { title: say(locale, "Nothing to refund", "لا يوجد ما يُسترد"), body: say(locale, "No payment has been taken for this application.", "لم يُخصم أي مبلغ لهذا الطلب.") },
    unknown: { title: say(locale, "Refund", "الاسترداد"), body: "" },
  };
}

export default async function RefundsPage({ params }: Page) {
  const { locale } = await params;
  const [faqs, reviews, content] = await Promise.all([listFaqs("refunds"), listReviews("refunds"), requirePageContent("transparency/refunds-policy")]);
  const arabic = isArabicLocale(locale);
  const stages = refundStages(content.rows, locale);
  const verdicts = verdictCopy(locale);
  const faqItems = refundFaqItems(faqs, content.faq, locale);
  const realReviews = reviews.filter((review) => !review.isSample);
  const average = realReviews.length ? realReviews.reduce((sum, review) => sum + review.rating, 0) / realReviews.length : null;
  const orderedReviews = [...realReviews, ...reviews.filter((review) => review.isSample)];
  const account = href("/account", locale);
  const firstRefundable = Math.max(0, stages.findIndex((stage) => stage.verdict === "yes"));
  const copy: PickerCopy = {
    stagesLabel: say(locale, "Application stages", "مراحل الطلب"),
    happens: t(locale, "refunds.happening"),
    why: t(locale, "refunds.reason"),
    inAccount: say(locale, "In your account:", "في حسابك:"),
    cta: say(locale, "Open my account", "افتح حسابي"),
    ctaHref: account,
    verdicts,
  };

  return (
    <>
      <InfoHero
        kicker={say(locale, "Transparency", "الشفافية")}
        title={content.title}
        intro={content.intro}
        actions={
          <>
            <a href="#where" className={infoPrimary}>
              {say(locale, "Check my stage", "اعرف مرحلتي")}
            </a>
            <Link href={account} className={infoSecondary}>
              {say(locale, "Open my account", "افتح حسابي")}
            </Link>
          </>
        }
        aside={
          <InfoCard className="bg-white/90">
            <p className="text-sm font-semibold text-[#16182b]">{say(locale, "In short", "باختصار")}</p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-body">
              {[
                say(locale, "A refund is a request you send from your account.", "الاسترداد طلب ترسله من حسابك."),
                say(locale, "A person reviews every request. Nothing is refunded automatically.", "يراجع شخص كل طلب. لا يُرد شيء تلقائياً."),
                say(locale, "Approved refunds go back to the card through the payment provider.", "المبالغ الموافَق عليها تعود إلى البطاقة عبر مزود الدفع."),
              ].map((line, index) => (
                <li key={index} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{index + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </InfoCard>
        }
      />

      {stages.length ? (
        <InfoSection id="where" title={content.pickerTitle} hint={content.pickerHint}>
          <RefundStagePicker stages={stages} copy={copy} initial={firstRefundable} />
        </InfoSection>
      ) : null}

      {stages.length ? (
        <InfoSection id="stages" title={say(locale, "Every stage at a glance", "كل المراحل باختصار")} className="bg-[#f7f8fc]">
          <div className="hidden overflow-hidden rounded-[22px] border border-[#e3e5f2] bg-white md:block">
            <table className="w-full table-fixed text-start text-sm">
              <thead className="bg-[#f4f5fd] text-xs text-muted-ink">
                <tr>
                  <th scope="col" className="w-[22%] px-5 py-3 text-start font-semibold">{t(locale, "refunds.stage")}</th>
                  <th scope="col" className="w-[26%] px-5 py-3 text-start font-semibold">{t(locale, "refunds.happening")}</th>
                  <th scope="col" className="w-[22%] px-5 py-3 text-start font-semibold">{t(locale, "refunds.refund")}</th>
                  <th scope="col" className="px-5 py-3 text-start font-semibold">{t(locale, "refunds.reason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceef6]">
                {stages.map((stage, index) => (
                  <tr key={`${stage.stage}-${index}`} className="align-top">
                    <th scope="row" className="px-5 py-4 text-start font-semibold text-[#16182b]">{stage.stage}</th>
                    <td className="px-5 py-4 text-body">{stage.happens}</td>
                    <td className="px-5 py-4">
                      <VerdictPill verdict={stage.verdict}>{stage.refund}</VerdictPill>
                    </td>
                    <td className="px-5 py-4 text-body">{stage.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ol className="grid gap-3 md:hidden">
            {stages.map((stage, index) => (
              <li key={`${stage.stage}-${index}`} className="min-w-0 rounded-[18px] border border-[#e3e5f2] bg-white p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold text-[#16182b]">{stage.stage}</p>
                  <VerdictPill verdict={stage.verdict}>{stage.refund}</VerdictPill>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-body">{stage.happens}</p>
                {stage.reason ? <p className="mt-2 text-xs leading-relaxed text-muted-ink">{stage.reason}</p> : null}
              </li>
            ))}
          </ol>
        </InfoSection>
      ) : null}

      <InfoSection title={say(locale, "How a refund request works", "كيف يعمل طلب الاسترداد")}>
        <Steps
          items={[
            { title: say(locale, "Open the application", "افتح الطلب"), body: say(locale, "Sign in and open the application from your account.", "سجّل الدخول وافتح الطلب من حسابك.") },
            { title: say(locale, "Write a short reason", "اكتب سبباً قصيراً"), body: say(locale, "Tell us why in a sentence or two, then send the request.", "اشرح السبب في جملة أو اثنتين، ثم أرسل الطلب.") },
            { title: say(locale, "A staff member decides", "يقرر أحد الموظفين"), body: say(locale, "You see the answer in your account. A card refund can take a few working days.", "ترى الرد في حسابك. قد يستغرق رد المبلغ إلى البطاقة بضعة أيام عمل.") },
          ]}
        />
      </InfoSection>

      {faqItems.length ? (
        <InfoSection title={say(locale, "Refund questions", "أسئلة عن الاسترداد")} className="pt-0 md:pt-0">
          <div className="max-w-3xl">
            <FaqList items={faqItems} />
          </div>
        </InfoSection>
      ) : null}

      {orderedReviews.length ? (
        <InfoSection
          title={realReviews.length ? say(locale, "What travellers said about refunds", "ماذا قال المسافرون عن الاسترداد") : say(locale, "Example reviews", "أمثلة على التقييمات")}
          hint={
            average !== null
              ? say(
                  locale,
                  `Average ${average.toFixed(1)} of 5 from ${realReviews.length} real ${realReviews.length === 1 ? "review" : "reviews"}. Examples are not counted.`,
                  `المتوسط ${average.toFixed(1)} من 5، من ${arabicReviewCount(realReviews.length)}. الأمثلة لا تُحسب.`,
                )
              : say(locale, "Reviews marked Example are illustrations, not real customers.", "التقييمات المعلَّمة «مثال» توضيحية، وليست من عملاء حقيقيين.")
          }
          className="pt-0 md:pt-0"
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {orderedReviews.map((item) => {
              const review = localizeReview(item, locale);
              const untranslated = arabic && !item.bodyAr;
              return (
                <li key={review.id} className="min-w-0">
                  <figure className="flex h-full min-w-0 flex-col rounded-[18px] border border-[#e3e5f2] bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.isSample ? <Badge accent="amber">{say(locale, "Example", "مثال")}</Badge> : item.verified ? <Badge accent="green">{say(locale, "Verified", "موثّق")}</Badge> : null}
                    </div>
                    <blockquote lang={untranslated ? "en" : undefined} dir={untranslated ? "ltr" : undefined} className={cn("mt-3 flex-1 text-sm leading-relaxed text-body", untranslated && "text-start")}>
                      {review.body}
                    </blockquote>
                    <figcaption className="mt-4 flex min-w-0 items-center gap-3 text-sm">
                      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f5fd] text-xs font-semibold text-brand-700">
                        {initials(review.author)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[#16182b]">{review.author}</span>
                        {review.publishedAt ? <span className="block text-xs text-muted-ink">{formatDate(review.publishedAt, locale)}</span> : null}
                      </span>
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ul>
        </InfoSection>
      ) : null}

      <CtaBand
        title={content.ctaTitle || say(locale, "Refund requests are sent from your account", "طلب الاسترداد يُرسل من حسابك")}
        body={content.ctaBody}
        actions={
          <>
            <Link href={account} className={infoOnDark}>
              {say(locale, "Open my account", "افتح حسابي")}
            </Link>
            <Link href={href("/contact", locale)} className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10">
              {say(locale, "Contact support", "تواصل مع الدعم")}
            </Link>
          </>
        }
      />
      <TrustNav locale={locale} current="/transparency/refunds-policy" />
    </>
  );
}

function arabicReviewCount(count: number) {
  if (count === 1) return "تقييم حقيقي واحد";
  if (count === 2) return "تقييمين حقيقيين";
  if (count <= 10) return `${count} تقييمات حقيقية`;
  return `${count} تقييماً حقيقياً`;
}

function VerdictPill({ verdict, children }: { verdict: RefundVerdict; children: ReactNode }) {
  return <span className={cn("inline-flex max-w-full shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", verdictTone[verdict])}>{children}</span>;
}
