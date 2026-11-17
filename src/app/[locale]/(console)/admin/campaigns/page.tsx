import { redirect } from "next/navigation";
import type { Page } from "@/lib/page";

export default async function OldCampaignsPage({ params }: Page) {
  const { locale } = await params;
  redirect(`/${locale}/admin/marketing/campaigns`);
}
