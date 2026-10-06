import { notFound } from "next/navigation";
import { CitizenshipDialog } from "@/components/layout/citizenship-picker";
import { VisaView } from "@/components/visa/visa-view";
import { siteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/lib/auth";
import { findOpenApplication } from "@/lib/data/applications";
import { getDestinationBySlug, listDestinations, listFaqs, listReviews, computedApprovalRate } from "@/lib/data/catalog";
import { getCitizenshipCodes, getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";
import { getCitizenship, hasChosenCitizenship } from "@/lib/preferences";
import { fillTemplate } from "@/lib/visa";

export async function generateMetadata({ params }: Page<{ locale: string; slug: string }>) {
  const { slug } = await params;
  const d = await getDestinationBySlug(slug);
  if (!d) return { title: "Visa" };
  return {
    title: `${d.name} Visa from ${siteConfig.market.countryName}`,
    description: fillTemplate(
      `Apply for a ${d.name} visa from ${siteConfig.market.countryName}. Fees, documents, and a staff-reviewed file.`,
      d.name,
    ),
  };
}

export default async function VisaPage({ params, searchParams }: Page<{ locale: string; slug: string }>) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();
  const [faqs, reviews, all, user, chosen, citizenship, settings, approvalRate, citizenshipCodes] = await Promise.all([
    listFaqs("visa", destination.id),
    listReviews("visa", destination.id),
    listDestinations(),
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
  return (
    <>
      <CitizenshipDialog initial={citizenship} codes={citizenshipCodes} defaultOpen={!chosen} />
      <VisaView
        locale={locale}
        destination={destination}
        faqs={faqs}
        reviews={reviews}
        nearby={nearby}
        existingId={existing?.id}
        applyOpen={String(sp.apply ?? "") === "1"}
        nowIso={new Date().toISOString()}
        approvalRate={approvalRate}
        brandName={settings.name}
        whatsapp={settings.whatsapp}
      />
    </>
  );
}
