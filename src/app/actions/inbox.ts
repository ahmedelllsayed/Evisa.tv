"use server";

import { t } from "@/lib/i18n";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addEvent, getApplication } from "@/lib/data/applications";
import { createContactMessage, createRefundRequest, getRefundRequest } from "@/lib/data/inbox";

export async function sendContactAction(input: { locale: string; name: string; email: string; topic: string; body: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const body = input.body.trim();
  if (name.length < 2) return { ok: false as const, error: t(input.locale, "err.name") };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: t(input.locale, "err.email") };
  if (body.length < 10) return { ok: false as const, error: t(input.locale, "err.message") };
  await createContactMessage({ name, email, topic: input.topic, body });
  revalidatePath("/en-EG/admin/messages");
  revalidatePath("/ar-EG/admin/messages");
  return { ok: true as const };
}

export async function requestRefundAction(locale: string, applicationId: string, reason: string) {
  const user = await requireUser(locale, `/${locale}/account/applications/${applicationId}`);
  const app = await getApplication(applicationId);
  if (!app || app.userId !== user.id) return { ok: false as const, error: t(locale, "err.notFound") };
  if (!app.paidAt || app.status === "refunded" || app.status === "draft" || app.status === "cancelled") {
    return { ok: false as const, error: t(locale, "err.noRefund") };
  }
  if (reason.trim().length < 8) return { ok: false as const, error: t(locale, "err.refundMore") };
  const existing = await getRefundRequest(applicationId);
  if (existing) return { ok: true as const, status: existing.status };
  await createRefundRequest({ applicationId, userId: user.id, reason });
  await addEvent(applicationId, {
    title: "Refund requested",
    description: reason.trim(),
    internal: true,
    onTime: true,
  });
  revalidatePath(`/${locale}/admin/queue`);
  revalidatePath(`/${locale}/admin/applications/${applicationId}`);
  return { ok: true as const, status: "open" as const };
}
