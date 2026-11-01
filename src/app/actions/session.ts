"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requestLocale } from "@/lib/request-locale";

export async function signOutAction() {
  const locale = await requestLocale();
  await signOut();
  redirect(`/${locale}`);
}
