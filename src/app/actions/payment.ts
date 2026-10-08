"use server";

import { redirect } from "next/navigation";
import { completeMockCheckout } from "@/lib/payments";
import { requestLocale } from "@/lib/request-locale";

export async function completeMockAction(token: string) {
  const locale = await requestLocale();
  const result = await completeMockCheckout(token);
  if (!result.ok) redirect(`/${locale}/account`);
  redirect(`/${locale}/payment/success?app=${result.applicationId}`);
}
