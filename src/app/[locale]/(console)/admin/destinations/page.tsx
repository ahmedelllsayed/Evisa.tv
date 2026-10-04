import { DestinationEditor } from "@/components/admin/destination-editor";
import { requireAdmin } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "Destinations" };

export default async function AdminDestinationsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const destinations = await listDestinations({ includeInactive: true });
  return <DestinationEditor locale={locale} destinations={destinations} />;
}
