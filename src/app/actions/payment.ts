"use server";

import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site.config";
import { completeMockCheckout } from "@/lib/payments";

export async function completeMockAction(token: string) {
  const result = await completeMockCheckout(token);
  if (!result.ok) redirect(`/${siteConfig.defaultLocale}/account`);
  redirect(`/${siteConfig.defaultLocale}/payment/success?app=${result.applicationId}`);
}
