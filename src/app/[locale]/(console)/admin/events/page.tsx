import { EventEditor } from "@/components/admin/event-editor";
import { requireAdmin } from "@/lib/auth";
import { listAllEvents, listDestinations } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "Events" };

export default async function AdminEventsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const [events, destinations] = await Promise.all([listAllEvents(), listDestinations({ includeInactive: true })]);
  return <EventEditor locale={locale} events={events} destinations={destinations.map((d) => ({ code: d.code, name: d.name }))} />;
}
