"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/data/db";
import { getSiteSettings } from "@/lib/data/settings";
import { env } from "@/lib/env";
import { createPaymobIntention, paymobReady } from "@/lib/paymob";
import { fulfillTravelOrder } from "@/lib/reservations/fulfill";
import { getTravelOrder } from "@/lib/reservations/orders";
import { createReservationQuote } from "@/lib/reservations/quote";
import { readTravelToken, travelToken } from "@/lib/reservations/token";

export async function quoteReservation(raw: unknown) {
  return createReservationQuote(raw);
}

export async function startReservationCheckout(id: string, locale: string) {
  const order = await getTravelOrder(id);
  if (!order || order.locale !== locale || order.status !== "pending_payment") {
    return { ok: false as const, error: "This reservation is not waiting for payment." };
  }
  const settings = await getSiteSettings();
  const integrationOverride = settings.extras.paymobIntegrationId ? [settings.extras.paymobIntegrationId] : undefined;
  const token = travelToken(order.id);
  const back = `${env.siteUrl}/${locale}/travel-reservations/success?token=${encodeURIComponent(token)}`;
  if (paymobReady(integrationOverride)) {
    const intention = await createPaymobIntention({
      amountCents: Math.round(order.amount * 100),
      currency: order.currency,
      merchantOrderId: order.reference,
      description: `Travel reservation ${order.reference}`,
      billing: { name: `${order.input.firstName} ${order.input.lastName}`, email: order.email, phone: order.phone },
      notificationUrl: `${env.siteUrl}/api/payments/paymob`,
      redirectionUrl: back,
      integrationIds: integrationOverride,
    });
    if (!intention.ok) return { ok: false as const, error: intention.error };
    await sql(`update travel_orders set paymob_order_id = $2, updated_at = now() where id = $1`, [order.id, intention.paymobOrderId]);
    return { ok: true as const, url: intention.url };
  }
  if (process.env.NODE_ENV === "production") return { ok: false as const, error: "Payment is not available." };
  return { ok: true as const, url: `/${locale}/travel-reservations/mock?token=${encodeURIComponent(token)}` };
}

export async function completeReservationMock(token: string, locale: string) {
  if (process.env.NODE_ENV === "production" || paymobReady()) redirect(`/${locale}/travel-reservations`);
  const id = readTravelToken(token);
  const order = id ? await getTravelOrder(id) : null;
  if (!order) redirect(`/${locale}/travel-reservations`);
  if (order.status === "pending_payment") {
    await sql(
      `update travel_orders set status = 'paid', paid_at = now(), transaction_id = $2, updated_at = now() where id = $1 and status = 'pending_payment'`,
      [order.id, `mock-${order.reference}`],
    );
    await fulfillTravelOrder(order.id);
  }
  redirect(`/${locale}/travel-reservations/status?token=${encodeURIComponent(travelToken(order.id))}`);
}
