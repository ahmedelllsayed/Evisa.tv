import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import Link from "next/link";
import { RejectionPicker } from "@/components/tools/rejection-picker";
import { listDestinations } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { visaHref } from "@/lib/href";
import { localizedDestinationName } from "@/lib/localize";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/rejection-recovery", { en: "Rejection Recovery", ar: "ملاحظات الرفض" });
}

export default async function RejectionRecoveryPage({ params }: Page) {
  const { locale } = await params;
  const [content, settings, destinations] = await Promise.all([
    requirePageContent("rejection-recovery"),
    getSiteSettings(),
    listDestinations(),
  ]);
  const covered = destinations.filter((destination) => destination.rejectionReasons.length > 0);
  if (!covered.length) {
    return <RejectionPicker locale={locale} brandName={settings.name} title={content.title} intro={content.intro} />;
  }
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-sans text-3xl font-semibold tracking-tight">{content.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-body">{content.intro}</p>
      <ul className="mt-8 space-y-8">
        {covered.map((destination) => (
          <li key={destination.id}>
            <Link href={visaHref(destination.slug, locale)} className="font-medium text-brand">
              {localizedDestinationName(destination, locale)}
            </Link>
            <ul className="mt-3 space-y-3 text-sm">
              {destination.rejectionReasons.map((reason) => {
                const arabic = locale.startsWith("ar");
                const title = arabic && reason.titleAr ? reason.titleAr : reason.title;
                const body = arabic && reason.bodyAr ? reason.bodyAr : reason.body;
                return (
                  <li key={reason.title}>
                    <p className="font-medium">{title}</p>
                    <p className="text-body">{body}</p>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </article>
  );
}
