import { EventEditor } from "@/components/admin/event-editor";
import { cairoToday, contentAccess } from "@/components/admin/content/access";
import { byText } from "@/components/admin/content/text";
import { requireAdmin } from "@/lib/auth";
import { listAllEvents, listDestinations } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "Events" };

export default async function AdminEventsPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [events, destinations, access] = await Promise.all([listAllEvents(), listDestinations({ includeInactive: true }), contentAccess(user.role)]);
  const countries = destinations
    .map((d) => ({ code: d.code, name: d.name, nameAr: d.nameAr ?? null, image: d.image }))
    .sort((a, b) => byText(a.name, b.name));
  return <EventEditor locale={locale} events={events} countries={countries} today={cairoToday()} canEdit={access.canEdit} canDelete={access.canDelete} />;
}
