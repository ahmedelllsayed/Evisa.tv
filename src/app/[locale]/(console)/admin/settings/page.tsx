import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";

export const metadata = { title: "الإعدادات" };

export default async function AdminSettingsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const settings = await getSiteSettings();
  return <SettingsForm locale={locale} settings={settings} />;
}
