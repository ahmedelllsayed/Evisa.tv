import "server-only";
import { serverEnv } from "@/lib/env";
import { applyPaymobCallback } from "@/lib/data/applications";
import { paymobHmacHex, sameHex } from "@/lib/paymob-hmac";

type Billing = { name: string; email: string; phone: string };

export function paymobReady(integrationIds?: string[]) {
  const { paymob } = serverEnv();
  const ids = integrationIds?.length ? integrationIds : paymob.integrationIds;
  return Boolean(paymob.secretKey && paymob.publicKey && paymob.hmacSecret && ids.length);
}

function methods(integrationIds?: string[]) {
  const ids = integrationIds?.length ? integrationIds : serverEnv().paymob.integrationIds;
  return ids.map((id) => (/^\d+$/.test(id) ? Number(id) : id));
}

export async function createPaymobIntention(input: {
  amountCents: number;
  currency: string;
  merchantOrderId: string;
  description: string;
  billing: Billing;
  notificationUrl: string;
  redirectionUrl: string;
  integrationIds?: string[];
}) {
  const { paymob } = serverEnv();
  const [first, ...rest] = input.billing.name.trim().split(/\s+/);
  const body = {
    amount: input.amountCents,
    currency: input.currency,
    payment_methods: methods(input.integrationIds),
    items: [{ name: input.description.slice(0, 80) || "Visa application", amount: input.amountCents, quantity: 1 }],
    billing_data: {
      first_name: first || "Customer",
      last_name: rest.join(" ") || "Customer",
      email: input.billing.email,
      phone_number: input.billing.phone,
      street: "NA",
      building: "NA",
      floor: "NA",
      apartment: "NA",
      city: "Cairo",
      state: "Cairo",
      country: "EGY",
    },
    special_reference: input.merchantOrderId,
    notification_url: input.notificationUrl,
    redirection_url: input.redirectionUrl,
  };
  const response = await fetch(`${paymob.baseUrl}/v1/intention/`, {
    method: "POST",
    headers: { Authorization: `Token ${paymob.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as {
    client_secret?: string;
    intention_order_id?: number | string;
    detail?: string;
  } | null;
  if (!response.ok || !payload?.client_secret) {
    const sent = methods(input.integrationIds).join(",");
    console.error("[paymob] intention failed", response.status, "integration", sent, payload?.detail ?? "no client_secret");
    return { ok: false as const, error: "Could not start the payment. Check the Paymob integration settings." };
  }
  const checkout = new URL(paymob.checkoutUrl);
  checkout.searchParams.set("publicKey", paymob.publicKey);
  checkout.searchParams.set("clientSecret", payload.client_secret);
  return {
    ok: true as const,
    url: checkout.toString(),
    paymobOrderId: payload.intention_order_id == null ? null : String(payload.intention_order_id),
  };
}

export function paymobHmac(obj: Record<string, unknown>) {
  return paymobHmacHex(obj, serverEnv().paymob.hmacSecret);
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export async function handlePaymobWebhook(rawBody: string, hmac: string | null) {
  if (!serverEnv().paymob.hmacSecret || !hmac) return { ok: false, status: 401 };
  let body: { obj?: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody) as { obj?: Record<string, unknown> };
  } catch {
    return { ok: false, status: 400 };
  }
  const obj = body.obj;
  if (!obj || !sameHex(paymobHmac(obj).toLowerCase(), hmac.toLowerCase())) return { ok: false, status: 401 };
  const order = obj.order && typeof obj.order === "object" ? (obj.order as Record<string, unknown>) : {};
  const paymobOrderId = text(order.id) || (typeof obj.order === "number" || typeof obj.order === "string" ? text(obj.order) : "");
  const merchantOrderId = text(order.merchant_order_id) || text(obj.merchant_order_id) || text(obj.special_reference);
  const amountCents = Number(obj.amount_cents);
  const currency = text(obj.currency).trim().toUpperCase();
  if (!paymobOrderId || !Number.isFinite(amountCents)) return { ok: false, status: 400 };
  const source = obj.source_data && typeof obj.source_data === "object" ? (obj.source_data as Record<string, unknown>) : {};
  const result = await applyPaymobCallback({
    merchantOrderId,
    paymobOrderId,
    transactionId: text(obj.id),
    amountCents,
    currency,
    success: obj.success === true || obj.success === "true",
    pending: obj.pending === true || obj.pending === "true",
    refunded: obj.is_refunded === true || obj.is_refunded === "true",
    method: text(source.type) || null,
  });
  if (!result.ok) return { ok: false, status: result.reason === "missing" ? 404 : 409 };
  return { ok: true, status: 200 };
}

export async function refundPaymob(transactionId: string, amountCents: number) {
  const { paymob } = serverEnv();
  if (!paymob.apiKey) return { ok: false as const, error: "PAYMOB_API_KEY is required to refund a Paymob payment." };
  const auth = await fetch(`${paymob.baseUrl}/api/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: paymob.apiKey }),
  });
  const token = (await auth.json().catch(() => null)) as { token?: string } | null;
  if (!auth.ok || !token?.token) return { ok: false as const, error: "Could not authorize the Paymob refund." };
  const refund = await fetch(`${paymob.baseUrl}/api/acceptance/void_refund/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth_token: token.token, transaction_id: transactionId, amount_cents: amountCents }),
  });
  if (!refund.ok) {
    console.error("[paymob] refund failed", refund.status);
    return { ok: false as const, error: "Paymob refused the refund." };
  }
  return { ok: true as const };
}

