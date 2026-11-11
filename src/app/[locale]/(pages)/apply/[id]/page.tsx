import { notFound } from "next/navigation";
import { marketToday } from "@/components/account/profile/rules";
import { ApplyWizard } from "@/components/apply/apply-wizard";
import { siteConfig } from "@/config/site.config";
import { requireUser } from "@/lib/auth";
import { countries, countryName } from "@/lib/countries";
import { getApplication, listDocuments, listPayments, listTravelers } from "@/lib/data/applications";
import { listAnswers, listActiveQuestions } from "@/lib/data/questions";
import { attachProfileDocuments, getProfileVault } from "@/lib/data/profile-vault";
import { isArabicLocale } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import type { Page } from "@/lib/page";
import { localizedMetadata } from "@/lib/seo";

/** Sorted on the server. ICU collation differs between Node and the browser. */
function nationalityOptions(locale: string) {
  const collator = new Intl.Collator(isArabicLocale(locale) ? "ar" : "en");
  const home = siteConfig.market.countryCode;
  const list = countries
    .map((country) => ({ code: country.code, name: countryName(country.code, locale) }))
    .sort((a, b) => collator.compare(a.name, b.name));
  return [...list.filter((country) => country.code === home), ...list.filter((country) => country.code !== home)];
}

export async function generateMetadata({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  return localizedMetadata(locale, `/apply/${id}`, { en: "Complete your application", ar: "أكمل الطلب" });
}

export default async function ApplyPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const user = await requireUser(locale, `/${locale}/apply/${id}`);
  const application = await getApplication(id);
  if (!application || application.userId !== user.id) notFound();
  const reusable = application.userId === user.id && (application.status === "draft" || application.status === "payment_pending");
  if (reusable) await attachProfileDocuments(user.id, id);
  const [travelers, documents, profile, payments, questions, savedAnswers] = await Promise.all([
    listTravelers(id),
    listDocuments(id),
    reusable ? getProfileVault(user.id) : Promise.resolve(null),
    listPayments(id),
    listActiveQuestions(application.visaOptionId),
    listAnswers(id),
  ]);
  const countLocked = payments.some((payment) => payment.status === "pending" || payment.status === "paid");
  return (
    <ApplyWizard
      locale={locale}
      application={application}
      travelers={travelers}
      documents={documents}
      profile={profile}
      countLocked={countLocked}
      phone={user.phone}
      today={marketToday()}
      nationalities={nationalityOptions(locale)}
      questions={questions}
      savedAnswers={savedAnswers}
      destinationLabel={localizedDestinationName(
        { name: application.destinationName, nameAr: application.destinationNameAr, code: application.destinationCode },
        locale,
      )}
    />
  );
}
