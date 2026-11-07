import { notFound } from "next/navigation";
import { ApplicationTracker } from "@/components/account/application-tracker";
import { OfferCard } from "@/components/account/offer-card";
import { requireUser } from "@/lib/auth";
import { databaseNow } from "@/lib/data/admin-applications";
import { getApplication, listDocuments, listEvents, listPayments, listTravelers } from "@/lib/data/applications";
import { getDestinationById } from "@/lib/data/catalog";
import { getRefundRequest } from "@/lib/data/inbox";
import { getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";
import { localizedDestinationName } from "@/lib/localize";
import { isStaffRole } from "@/lib/rbac-constants";
import { localizedMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  return {
    ...localizedMetadata(locale, `/account/applications/${id}`, { en: "Track application", ar: "متابعة الطلب" }),
    robots: { index: false, follow: false },
  };
}

export default async function ApplicationDetailPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const user = await requireUser(locale, `/${locale}/account/applications/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const app = await getApplication(id);
  if (!app || (app.userId !== user.id && !isStaffRole(user.role))) notFound();
  const [events, documents, travelers, payments, refund, settings, now, destination] = await Promise.all([
    listEvents(id, { publicOnly: true }),
    listDocuments(id),
    listTravelers(id),
    listPayments(id),
    getRefundRequest(id),
    getSiteSettings(),
    databaseNow(),
    getDestinationById(app.destinationId),
  ]);
  return (
    <ApplicationTracker
      locale={locale}
      application={app}
      destinationName={localizedDestinationName(destination ?? { name: app.destinationName, nameAr: app.destinationNameAr }, locale)}
      events={events}
      documents={documents}
      travelers={travelers}
      payments={payments}
      refundStatus={refund?.status ?? null}
      now={new Date(now).getTime()}
      readOnly={app.userId !== user.id}
      support={{ email: settings.supportEmail, phone: settings.phone }}
      offer={app.paidAt ? <OfferCard locale={locale} extras={settings.extras} variant="sidebar" /> : null}
    />
  );
}
