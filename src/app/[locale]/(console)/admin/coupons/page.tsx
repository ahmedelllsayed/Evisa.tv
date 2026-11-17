import { redirect } from "next/navigation";
import type { Page } from "@/lib/page";

export default async function OldCouponsPage({ params }: Page) {
  const { locale } = await params;
  redirect(`/${locale}/admin/marketing/coupons`);
}
