import { notFound } from "next/navigation";
import { ApplicationTracker } from "@/components/account/application-tracker";
import { OfferCard } from "@/components/account/offer-card";
import { requireUser } from "@/lib/auth";
import { getApplication, listDocuments, listEvents, listTravelers } from "@/lib/data/applications";
import { listAnswers, questionsForApplication } from "@/lib/data/questions";
import { getRefundRequest } from "@/lib/data/inbox";
import { getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";

export default async function ApplicationDetailPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const app = await getApplication(id);
  if (!app || (app.userId !== user.id && user.role !== "admin")) notFound();
  const [events, documents, travelers, refund, settings, questions, answers] = await Promise.all([
    listEvents(id, { publicOnly: true }),
    listDocuments(id),
    listTravelers(id),
    getRefundRequest(id),
    getSiteSettings(),
    questionsForApplication(id),
    listAnswers(id),
  ]);
  return (
    <>
      {app.paidAt ? <OfferCard locale={locale} extras={settings.extras} /> : null}
      <ApplicationTracker
      locale={locale}
      application={app}
      events={events}
      documents={documents}
      travelers={travelers}
      questions={questions}
      answers={answers}
      refundStatus={refund?.status ?? null}
    />
    </>
  );
}
