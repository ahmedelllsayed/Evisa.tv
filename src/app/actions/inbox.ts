"use server";

import { t } from "@/lib/i18n";
import { revalidatePath } from "next/cache";
import { clientIp } from "@/lib/client-ip";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { addEvent, getApplication } from "@/lib/data/applications";
import { contactIpLimited, findOwnedApplication, recentContactCount } from "@/lib/data/help";
import { createContactMessage, createRefundRequest, getRefundRequest } from "@/lib/data/inbox";
import { isContactTopic, topicCopy } from "@/components/contact/topics";
import { say } from "@/lib/say";

export type ContactInput = {
  locale: string;
  name: string;
  email: string;
  topic: string;
  body: string;
  applicationId?: string;
  travelDate?: string;
  website?: string;
};

export type ContactField = "name" | "email" | "body" | "travelDate" | "applicationId";

export type ContactResult =
  | { ok: true; reference: string | null }
  | { ok: false; error: string; fields: Partial<Record<ContactField, string>> };

export async function sendContactAction(input: ContactInput): Promise<ContactResult> {
  const locale = String(input.locale ?? "");
  if (String(input.website ?? "").trim()) return { ok: true, reference: null };

  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const body = String(input.body ?? "").trim();
  const topic = isContactTopic(input.topic) ? input.topic : "general";
  const travelDate = String(input.travelDate ?? "").trim();
  const applicationId = String(input.applicationId ?? "").trim();

  const fields: Partial<Record<ContactField, string>> = {};
  if (name.length < 2) fields.name = t(locale, "err.name");
  else if (name.length > 120) fields.name = say(locale, "Keep the name under 120 characters.", "اجعل الاسم أقل من 120 حرفاً.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) fields.email = t(locale, "err.email");
  if (body.length < 10) fields.body = t(locale, "err.message");
  else if (body.length > 4000) fields.body = say(locale, "Keep the message under 4,000 characters.", "اجعل الرسالة أقل من 4000 حرف.");
  if (travelDate && !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) fields.travelDate = say(locale, "Pick a valid date.", "اختر تاريخاً صحيحاً.");

  const user = await getCurrentUser();
  const linked = user && applicationId ? await findOwnedApplication(user.id, applicationId) : null;
  if (user && applicationId && !linked) fields.applicationId = say(locale, "That application is not on your account.", "هذا الطلب غير موجود في حسابك.");

  if (Object.keys(fields).length) {
    return { ok: false, error: say(locale, "Check the highlighted fields.", "راجع الحقول المحددة."), fields };
  }

  const ip = await clientIp();
  if (contactIpLimited(ip) || (await recentContactCount(email)) >= 5) {
    return {
      ok: false,
      error: say(locale, "Too many messages in a short time. Wait a few minutes and try again.", "رسائل كثيرة في وقت قصير. انتظر بضع دقائق ثم أعد المحاولة."),
      fields: {},
    };
  }

  const label = [topicCopy[topic].inbox, linked?.reference].filter(Boolean).join(" · ");
  const fullBody = travelDate ? `${body}\n\nموعد السفر / Travel date: ${travelDate}` : body;
  await createContactMessage({ name, email, topic: label, body: fullBody, userId: user?.id ?? null, applicationId: linked?.id ?? null });
  revalidatePath("/en-EG/admin/messages");
  revalidatePath("/ar-EG/admin/messages");
  return { ok: true, reference: linked?.reference ?? null };
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
