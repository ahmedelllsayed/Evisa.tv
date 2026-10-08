import "server-only";
import { serverEnv } from "@/lib/env";
import { applyPaymobCallback } from "@/lib/data/applications";
import { paymobSignatureMatches } from "@/lib/paymob-hmac";

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
  const checkout = new URL("unifiedcheckout/", `${paymob.baseUrl}/`);
  checkout.searchParams.set("publicKey", paymob.publicKey);
  checkout.searchParams.set("clientSecret", payload.client_secret);
  return {
    ok: true as const,
    url: checkout.toString(),
    paymobOrderId: payload.intention_order_id == null ? null : String(payload.intention_order_id),
  };
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function transactionRecord(parsed: unknown): Record<string, unknown> | null {
  const body = asRecord(parsed);
  if (!body) return null;
  const wrapped = body.obj ?? body.transaction;
  if (typeof wrapped === "string") {
    try {
      return asRecord(JSON.parse(wrapped));
    } catch {
      return null;
    }
  }
  const record = asRecord(wrapped);
  if (record) return record;
  if ("amount_cents" in body || "success" in body || "id" in body) return body;
  return null;
}

function numericId(value: unknown) {
  const id = text(value).trim();
  return /^\d+$/.test(id) ? id : "";
}

function callbackHmac(parsed: unknown, hmac: string | null) {
  const direct = hmac?.trim();
  if (direct) return direct;
  const body = asRecord(parsed);
  return typeof body?.hmac === "string" ? body.hmac.trim() : "";
}

async function paymobAuthToken() {
  const { paymob } = serverEnv();
  if (!paymob.apiKey) return null;
  const auth = await fetch(`${paymob.baseUrl}/api/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: paymob.apiKey }),
  });
  const token = (await auth.json().catch(() => null)) as { token?: string } | null;
  if (!auth.ok || !token?.token) return null;
  return token.token;
}

async function fetchPaymobTransaction(id: string) {
  const token = await paymobAuthToken();
  if (!token) return null;
  const response = await fetch(`${serverEnv().paymob.baseUrl}/api/acceptance/transactions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || numericId(body.id) !== id) return null;
  return body;
}

async function applyTransaction(obj: Record<string, unknown>) {
  const order = obj.order && typeof obj.order === "object" ? (obj.order as Record<string, unknown>) : {};
  const paymobOrderId = text(order.id) || (typeof obj.order === "number" || typeof obj.order === "string" ? text(obj.order) : "") || text(obj.order_id);
  const merchantOrderId = text(order.merchant_order_id) || text(obj.merchant_order_id) || text(obj.special_reference);
  const amountCents = Number(obj.amount_cents);
  const currency = text(obj.currency).trim().toUpperCase();
  if (!paymobOrderId || !Number.isFinite(amountCents)) return { ok: false as const, status: 400 };
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
    method: text(source.type) || text(obj["source_data.type"]) || null,
  });
  if (!result.ok) return { ok: false as const, status: result.reason === "missing" ? 404 : 409 };
  return { ok: true as const, status: 200 };
}

export async function handlePaymobWebhook(rawBody: string, hmac: string | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
    if (typeof parsed === "string") parsed = JSON.parse(parsed) as unknown;
  } catch {
    return { ok: false, status: 400 };
  }
  const obj = transactionRecord(parsed);
  const provided = callbackHmac(parsed, hmac);
  const secret = serverEnv().paymob.hmacSecret;
  if (secret && provided && obj && paymobSignatureMatches(obj, provided, secret)) return applyTransaction(obj);

  const id = numericId(obj?.id) || numericId(asRecord(parsed)?.id);
  if (id) {
    const confirmed = await fetchPaymobTransaction(id).catch(() => null);
    if (confirmed) {
      console.error("[paymob] callback signature was rejected; applied the transaction confirmed by Paymob", id);
      return applyTransaction(confirmed);
    }
  }
  console.error("[paymob] callback rejected", { hmac: Boolean(provided), hmacLength: provided.length, transaction: Boolean(obj), id: id || null });
  return { ok: false, status: 401 };
}

export async function refundPaymob(transactionId: string, amountCents: number) {
  const { paymob } = serverEnv();
  if (!paymob.apiKey) return { ok: false as const, error: "PAYMOB_API_KEY is required to refund a Paymob payment." };
  const token = await paymobAuthToken();
  if (!token) return { ok: false as const, error: "Could not authorize the Paymob refund." };
  const refund = await fetch(`${paymob.baseUrl}/api/acceptance/void_refund/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth_token: token, transaction_id: transactionId, amount_cents: amountCents }),
  });
  if (!refund.ok) {
    console.error("[paymob] refund failed", refund.status);
    return { ok: false as const, error: "Paymob refused the refund." };
  }
  return { ok: true as const };
}

