import { HolidayEditor } from "@/components/admin/holiday-editor";
import { cairoToday, contentAccess } from "@/components/admin/content/access";
import { requireAdmin } from "@/lib/auth";
import { listAllHolidays } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "العطل" };

export default async function AdminHolidaysPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const [holidays, access] = await Promise.all([listAllHolidays(), contentAccess(user.role)]);
  return <HolidayEditor locale={locale} holidays={holidays} today={cairoToday()} canEdit={access.canEdit} canDelete={access.canDelete} />;
}
