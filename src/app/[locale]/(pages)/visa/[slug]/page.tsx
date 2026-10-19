import { notFound } from "next/navigation";
import { CitizenshipDialog } from "@/components/layout/citizenship-picker";
import { VisaPreview } from "@/components/visa-page/visa-preview";
import { siteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/lib/auth";
import { findOpenApplication } from "@/lib/data/applications";
import { getDestinationBySlug, listDestinations, listFaqs, listReviews, computedApprovalRate } from "@/lib/data/catalog";
import { listVisaOptions } from "@/lib/data/visa-options";
import { getCitizenshipCodes, getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";
import { getCitizenship, hasChosenCitizenship } from "@/lib/preferences";
import { localizedMetadata } from "@/lib/seo";
import { fillTemplate, optionTotal, totalFee } from "@/lib/visa";

export async function generateMetadata({ params }: Page<{ locale: string; slug: string }>) {
  const { locale, slug } = await params;
  const d = await getDestinationBySlug(slug);
  if (!d) return localizedMetadata(locale, `/visa/${slug}`, { en: "Visa", ar: "تأشيرة" });
  const name = locale.startsWith("ar") && d.nameAr ? d.nameAr : d.name;
  return localizedMetadata(
    locale,
    `/visa/${slug}`,
    { en: `${d.name} Visa from ${siteConfig.market.countryName}`, ar: `تأشيرة ${name}` },
    {
      en: fillTemplate(`Apply for a ${d.name} visa from ${siteConfig.market.countryName}. Fees, documents, and a staff-reviewed file.`, d.name),
      ar: `قدّم لطلب تأشيرة ${name}. الرسوم والمستندات ومراجعة الفريق.`,
    },
  );
}

export default async function VisaPage({ params, searchParams }: Page<{ locale: string; slug: string }>) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();
  const [faqs, reviews, all, options, user, chosen, citizenship, settings, approvalRate, citizenshipCodes] = await Promise.all([
    listFaqs("visa", destination.id),
    listReviews("visa", destination.id),
    listDestinations(),
    listVisaOptions(destination.id),
    getCurrentUser(),
    hasChosenCitizenship(),
    getCitizenship(),
    getSiteSettings(),
    computedApprovalRate(),
    getCitizenshipCodes(),
  ]);
  const nearby = all
    .filter((d) => d.id !== destination.id && d.lat != null && destination.lat != null)
    .map((d) => ({
      d,
      dist: Math.hypot((d.lat ?? 0) - destination.lat!, (d.lng ?? 0) - destination.lng!),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 8)
    .map((x) => x.d);
  const existing = user ? await findOpenApplication(user.id, destination.id) : null;
  const priced = options.find((option) => option.isDefault) ?? options[0];
  const price = priced ? optionTotal(priced, false) : totalFee(destination);
  const arabic = locale.startsWith("ar");
  const country = arabic && destination.nameAr ? destination.nameAr : destination.name;
  const faqEntities = faqs.slice(0, 8).map((faq) => ({
    "@type": "Question",
    name: fillTemplate(arabic && faq.questionAr ? faq.questionAr : faq.question, country),
    acceptedAnswer: { "@type": "Answer", text: fillTemplate(arabic && faq.answerAr ? faq.answerAr : faq.answer, country) },
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: arabic && destination.nameAr ? `تأشيرة ${destination.nameAr}` : `${destination.name} visa`,
        areaServed: siteConfig.market.countryCode,
        offers: { "@type": "Offer", priceCurrency: destination.currency || "EGP", price: String(Math.round(price)) },
      },
      ...(faqEntities.length ? [{ "@type": "FAQPage", mainEntity: faqEntities }] : []),
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {destination.heroImage || destination.image ? (
        <link rel="preload" as="image" href={destination.heroImage || destination.image || ""} fetchPriority="high" />
      ) : null}
      <CitizenshipDialog initial={citizenship} codes={citizenshipCodes} defaultOpen={!chosen} />
      <VisaPreview
        locale={locale}
        destination={destination}
        options={options}
        initialOptionId={typeof sp.type === "string" ? sp.type : null}
        faqs={faqs}
        reviews={reviews}
        nearby={nearby}
        existingId={existing?.id}
        existingOptionId={existing?.visaOptionId}
        existingExpress={existing?.express}
        applyOpen={String(sp.apply ?? "") === "1"}
        nowIso={new Date().toISOString()}
        approvalRate={approvalRate}
        brandName={settings.name}
        whatsapp={settings.whatsapp}
      />
    </>
  );
}
