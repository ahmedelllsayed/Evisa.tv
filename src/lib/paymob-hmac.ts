import { createHmac, timingSafeEqual } from "node:crypto";

const hmacFields = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function nested(obj: Record<string, unknown>, path: string) {
  const [head, child] = path.split(".");
  if (!child) return obj[head];
  const parent = obj[head];
  if (parent == null) return undefined;
  if (typeof parent !== "object") return child === "id" ? parent : undefined;
  return (parent as Record<string, unknown>)[child];
}

/** Concatenation order documented for the Transaction Processed callback. */
export function paymobCallbackString(obj: Record<string, unknown>) {
  return hmacFields.map((field) => text(nested(obj, field))).join("");
}

export function paymobHmacHex(obj: Record<string, unknown>, secret: string) {
  return createHmac("sha512", secret).update(paymobCallbackString(obj)).digest("hex");
}

export function sameHex(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
