import { CitizenshipEditor } from "@/components/admin/citizenship-editor";
import { requireAdmin } from "@/lib/auth";
import { getCitizenshipCodes } from "@/lib/data/settings";
import type { Page } from "@/lib/page";

export const metadata = { title: "الجنسيات" };

export default async function AdminCitizenshipsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const selected = await getCitizenshipCodes();
  return <CitizenshipEditor locale={locale} selected={selected} />;
}
