"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/data/db";
import { sendMail } from "@/lib/email";
import { reservationReadyMail } from "@/lib/email-template";
import { getSiteSettings } from "@/lib/data/settings";
import { env } from "@/lib/env";
import { refundPaymob } from "@/lib/paymob";
import { fulfillTravelOrder } from "@/lib/reservations/fulfill";
import { getTravelOrder } from "@/lib/reservations/orders";
import { travelToken } from "@/lib/reservations/token";
import { readStoredBytes } from "@/lib/storage";

async function load(locale: string, id: string) {
  await requireAdmin(locale);
  const order = await getTravelOrder(id);
  if (!order) throw new Error("Order not found");
  return order;
}

function refresh(locale: string, id: string) {
  revalidatePath(`/${locale}/admin/reservations`);
  revalidatePath(`/${locale}/admin/reservations/${id}`);
}

export async function adminRetryReservation(locale: string, id: string) {
  const order = await load(locale, id);
  if (order.status !== "needs_attention" && order.status !== "paid") return;
  await fulfillTravelOrder(id);
  await recordAudit("reservation.retry", id, order.reference);
  refresh(locale, id);
}

export async function adminResendReservation(locale: string, id: string) {
  const order = await load(locale, id);
  if (!order.files.length) return;
  const settings = await getSiteSettings();
  const link = `${env.siteUrl}/${order.locale}/travel-reservations/status?token=${encodeURIComponent(travelToken(order.id))}`;
  const mail = reservationReadyMail({
    locale: order.locale,
    brand: settings.name,
    tagline: settings.tagline,
    supportEmail: settings.supportEmail,
    reference: order.reference,
    href: link,
  });
  const attachments = await Promise.all(
    order.files.map(async (file) => ({ filename: file.name, content: await readStoredBytes(file.path), contentType: "application/pdf" })),
  );
  const sent = await sendMail({
    to: order.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments,
    idempotencyKey: `travel-resend-${order.id}-${Date.now()}`,
  });
  await recordAudit("reservation.resend", id, sent.sent ? order.reference : "email not sent");
  refresh(locale, id);
}

export async function adminCancelReservation(locale: string, id: string) {
  const order = await load(locale, id);
  await sql(`update travel_orders set status = 'cancelled', updated_at = now() where id = $1`, [id]);
  await recordAudit("reservation.cancel", id, order.reference);
  refresh(locale, id);
}

export async function adminRefundReservation(locale: string, id: string) {
  const order = await load(locale, id);
  if (!order.transactionId || order.status === "refunded") return;
  if (!order.transactionId.startsWith("mock")) {
    const refund = await refundPaymob(order.transactionId, Math.round(order.amount * 100));
    if (!refund.ok) {
      await sql(`update travel_orders set error = $2, updated_at = now() where id = $1`, [id, refund.error]);
      await recordAudit("reservation.refund", id, refund.error);
      refresh(locale, id);
      return;
    }
  }
  await sql(`update travel_orders set status = 'refunded', error = null, updated_at = now() where id = $1`, [id]);
  await recordAudit("reservation.refund", id, order.reference);
  refresh(locale, id);
}
