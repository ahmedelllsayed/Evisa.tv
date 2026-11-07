import { notFound } from "next/navigation";
import { AdminApplicationDetail } from "@/components/admin/application-detail";
import { requireAdmin } from "@/lib/auth";
import { applicationCustomer, databaseNow } from "@/lib/data/admin-applications";
import { getApplication, listDocuments, listEvents, listPayments, listStatusHistory, listTravelers } from "@/lib/data/applications";
import { getRefundRequest } from "@/lib/data/inbox";
import { listUsers } from "@/lib/data/users";
import { isStaffRole } from "@/lib/rbac-constants";
import type { Page } from "@/lib/page";

export async function generateMetadata({ params }: Page<{ locale: string; id: string }>) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "طلب" };
  const app = await getApplication(id);
  return { title: app ? app.reference : "طلب" };
}

export default async function AdminApplicationPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const user = await requireAdmin(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const app = await getApplication(id);
  if (!app) notFound();
  const [events, travelers, documents, payments, users, refund, history, customer, now] = await Promise.all([
    listEvents(id),
    listTravelers(id),
    listDocuments(id),
    listPayments(id),
    listUsers(),
    getRefundRequest(id),
    listStatusHistory(id),
    applicationCustomer(app.userId),
    databaseNow(),
  ]);
  return (
    <AdminApplicationDetail
      locale={locale}
      application={app}
      events={events}
      travelers={travelers}
      documents={documents}
      payments={payments}
      assignees={users.filter((person) => isStaffRole(person.role) && person.role !== "viewer")}
      refundRequest={refund ? { status: refund.status, reason: refund.reason } : null}
      history={history}
      customer={customer}
      now={now}
      currentUserId={user.id}
    />
  );
}
