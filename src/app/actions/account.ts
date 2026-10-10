"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { markNotificationsRead as markRead } from "@/lib/data/notifications";

export async function markNotificationsRead(locale: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  await markRead(user.id);
  revalidatePath(`/${locale}`, "layout");
  revalidatePath(`/${locale}/account`);
  return { ok: true as const };
}
