export type StoredPaymentCheck = {
  merchantOrderId: string | null;
  currency: string;
  amount: number;
  transactionId: string | null;
  status: string;
};

export type IncomingPaymentCheck = {
  merchantOrderId: string;
  amountCents: number;
  currency: string;
  success: boolean;
  pending: boolean;
  refunded: boolean;
  transactionId: string;
};

export type PaymobDecision =
  | { ok: false; reason: "order" | "currency" | "amount" }
  | { ok: true; reason: "duplicate" | "refunded" | "pending" | "failed" | "paid" };

/** Decides what a Paymob callback means before any row is updated. */
export function paymobDecision(stored: StoredPaymentCheck, incoming: IncomingPaymentCheck): PaymobDecision {
  if (incoming.merchantOrderId && stored.merchantOrderId && incoming.merchantOrderId !== stored.merchantOrderId) {
    return { ok: false, reason: "order" };
  }
  const currency = incoming.currency.trim().toUpperCase();
  if (!currency || currency !== stored.currency.trim().toUpperCase()) return { ok: false, reason: "currency" };
  if (Math.round(stored.amount * 100) !== incoming.amountCents) return { ok: false, reason: "amount" };
  if (
    stored.transactionId &&
    stored.transactionId === incoming.transactionId &&
    (stored.status === "paid" || stored.status === "refunded" || stored.status === "failed")
  ) {
    return { ok: true, reason: "duplicate" };
  }
  if (incoming.refunded && stored.status === "paid") return { ok: true, reason: "refunded" };
  if (incoming.pending) return { ok: true, reason: "pending" };
  if (!incoming.success) return { ok: true, reason: "failed" };
  return { ok: true, reason: "paid" };
}

/** A successful charge marks the application paid only while it is still unpaid. */
export function paymentCanMarkPaid(status: string) {
  return status === "draft" || status === "payment_pending";
}
