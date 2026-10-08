import { DestinationEditor } from "@/components/admin/destination-editor";
import { requireAdmin } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import { listStoredDestinationMedia } from "@/lib/destination-media";
import type { Page } from "@/lib/page";

export const metadata = { title: "Destinations" };

export default async function AdminDestinationsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const destinations = await listDestinations({ includeInactive: true });
  const storedMedia = await listStoredDestinationMedia(destinations.map((destination) => destination.id));
  return <DestinationEditor locale={locale} destinations={destinations} storedMedia={storedMedia} />;
}
