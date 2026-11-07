import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";

export const metadata = { title: "الإعدادات" };

export default async function AdminSettingsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const [canView, canEdit] = await Promise.all([
    currentUserHasPermission("settings", "view"),
    currentUserHasPermission("settings", "edit"),
  ]);
  if (!canView) redirect(`/${locale}/admin`);
  const settings = await getSiteSettings();
  return <SettingsForm locale={locale} settings={settings} canEdit={canEdit} />;
}
