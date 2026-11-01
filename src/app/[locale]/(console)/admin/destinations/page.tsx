import { DestinationEditor } from "@/components/admin/destination-editor";
import { requireAdmin } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import { listAllVisaOptions, visaOptionStats } from "@/lib/data/visa-options";
import { listStoredDestinationMedia } from "@/lib/destination-media";
import type { Page } from "@/lib/page";

export const metadata = { title: "Destinations" };

export default async function AdminDestinationsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const destinations = await listDestinations({ includeInactive: true });
  const [storedMedia, options, stats] = await Promise.all([
    listStoredDestinationMedia(destinations.map((destination) => destination.id)),
    listAllVisaOptions(),
    visaOptionStats(),
  ]);
  const optionCounts = Object.fromEntries(stats.map((row) => [row.id, row.total]));
  return <DestinationEditor locale={locale} destinations={destinations} storedMedia={storedMedia} options={options} optionCounts={optionCounts} />;
}
