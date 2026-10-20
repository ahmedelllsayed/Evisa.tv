import "server-only";
import { after } from "next/server";
import { sql } from "@/lib/data/db";
import { paymobDecision } from "@/lib/paymob-decision";
import { fulfillTravelOrder } from "./fulfill";
import { getTravelOrderByMerchant } from "./orders";

export async function applyTravelOrderCallback(input: {
  merchantOrderId: string;
  paymobOrderId: string;
  transactionId: string;
  amountCents: number;
  currency: string;
  success: boolean;
  pending: boolean;
  refunded: boolean;
}) {
  const order = await getTravelOrderByMerchant(input.merchantOrderId);
  if (!order) return { ok: false as const, reason: "missing" as const };
  const storedStatus = order.status === "refunded" ? "refunded" : order.status === "pending_payment" ? "pending" : "paid";
  const decision = paymobDecision(
    {
      merchantOrderId: order.merchantOrderId,
      currency: order.currency,
      amount: order.amount,
      transactionId: order.transactionId,
      status: storedStatus,
    },
    input,
  );
  if (!decision.ok) {
    await sql(`update travel_orders set error = $2, updated_at = now() where id = $1`, [order.id, `Payment needs review (${decision.reason}).`]);
    return { ok: false as const, reason: decision.reason };
  }
  if (decision.reason === "paid" && order.status === "pending_payment") {
    await sql(
      `update travel_orders set status = 'paid', paid_at = now(), transaction_id = $2, paymob_order_id = $3, updated_at = now() where id = $1 and status = 'pending_payment'`,
      [order.id, input.transactionId, input.paymobOrderId],
    );
    after(() => fulfillTravelOrder(order.id));
  }
  if (decision.reason === "refunded") {
    await sql(`update travel_orders set status = 'refunded', updated_at = now() where id = $1`, [order.id]);
  }
  return { ok: true as const, reason: decision.reason };
}
