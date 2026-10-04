import { notFound } from "next/navigation";
import { ApplyWizard } from "@/components/apply/apply-wizard";
import { requireUser } from "@/lib/auth";
import { getApplication, listDocuments, listTravelers } from "@/lib/data/applications";
import { attachProfileDocuments, getProfileVault } from "@/lib/data/profile-vault";
import type { Page } from "@/lib/page";

export default async function ApplyPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const user = await requireUser(locale, `/${locale}/apply/${id}`);
  const application = await getApplication(id);
  if (!application || (application.userId !== user.id && user.role !== "admin")) notFound();
  const reusable = application.userId === user.id && (application.status === "draft" || application.status === "payment_pending");
  if (reusable) await attachProfileDocuments(user.id, id);
  const [travelers, documents, profile] = await Promise.all([
    listTravelers(id),
    listDocuments(id),
    reusable ? getProfileVault(user.id) : Promise.resolve(null),
  ]);
  return <ApplyWizard locale={locale} application={application} travelers={travelers} documents={documents} profile={profile} />;
}
