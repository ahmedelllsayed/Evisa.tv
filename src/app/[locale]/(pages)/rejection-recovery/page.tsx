import { RejectionPicker } from "@/components/tools/rejection-picker";
import { requirePageContent } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import type { Page } from "@/lib/page";

export const metadata = { title: "Rejection Recovery" };

export default async function RejectionRecoveryPage({ params }: Page) {
  const { locale } = await params;
  const [content, settings] = await Promise.all([requirePageContent("rejection-recovery"), getSiteSettings()]);
  return <RejectionPicker locale={locale} brandName={settings.name} title={content.title} intro={content.intro} />;
}
