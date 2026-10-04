import { notFound } from "next/navigation";
import { AdminApplicationDetail } from "@/components/admin/application-detail";
import { requireAdmin } from "@/lib/auth";
import { getApplication, listDocuments, listEvents, listPayments, listTravelers } from "@/lib/data/applications";
import { listUsers } from "@/lib/data/users";
import type { Page } from "@/lib/page";

export default async function AdminApplicationPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  await requireAdmin(locale);
  const app = await getApplication(id);
  if (!app) notFound();
  const [events, travelers, documents, payments, users] = await Promise.all([
    listEvents(id),
    listTravelers(id),
    listDocuments(id),
    listPayments(id),
    listUsers(),
  ]);
  return (
    <AdminApplicationDetail
      locale={locale}
      application={app}
      events={events}
      travelers={travelers}
      documents={documents}
      payments={payments}
      assignees={users.filter((user) => user.role === "admin")}
    />
  );
}
