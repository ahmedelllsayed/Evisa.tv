import { notFound } from "next/navigation";
import { ApplicationTracker } from "@/components/account/application-tracker";
import { requireUser } from "@/lib/auth";
import { getApplication, listDocuments, listEvents, listTravelers } from "@/lib/data/applications";
import type { Page } from "@/lib/page";

export default async function ApplicationDetailPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const app = await getApplication(id);
  if (!app || (app.userId !== user.id && user.role !== "admin")) notFound();
  const [events, documents, travelers] = await Promise.all([
    listEvents(id, { publicOnly: true }),
    listDocuments(id),
    listTravelers(id),
  ]);
  return <ApplicationTracker locale={locale} application={app} events={events} documents={documents} travelers={travelers} />;
}
