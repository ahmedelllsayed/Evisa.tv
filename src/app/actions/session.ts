"use server";

import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site.config";
import { signOut } from "@/lib/auth";

export async function signOutAction() {
  await signOut();
  redirect(`/${siteConfig.defaultLocale}`);
}
