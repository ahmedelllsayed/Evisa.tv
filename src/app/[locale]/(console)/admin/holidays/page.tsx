import { HolidayEditor } from "@/components/admin/holiday-editor";
import { requireAdmin } from "@/lib/auth";
import { listAllHolidays } from "@/lib/data/catalog";
import type { Page } from "@/lib/page";

export const metadata = { title: "العطل" };

export default async function AdminHolidaysPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const holidays = await listAllHolidays();
  return <HolidayEditor locale={locale} holidays={holidays} />;
}
