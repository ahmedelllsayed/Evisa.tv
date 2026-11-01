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

type BoolStyle = "words" | "python" | "php" | "bits";

function text(value: unknown, style: BoolStyle) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") {
    if (style === "python") return value ? "True" : "False";
    if (style === "php") return value ? "1" : "";
    if (style === "bits") return value ? "1" : "0";
    return value ? "true" : "false";
  }
  return String(value);
}

function nested(obj: Record<string, unknown>, path: string) {
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  const flat = path.replaceAll(".", "_");
  if (flat !== path && Object.prototype.hasOwnProperty.call(obj, flat)) return obj[flat];
  const [head, child] = path.split(".");
  if (!child) return obj[head];
  const parent = obj[head];
  if (parent == null) return undefined;
  if (typeof parent !== "object") return child === "id" ? parent : undefined;
  return (parent as Record<string, unknown>)[child];
}

/** Concatenation order documented for the Transaction Processed callback. */
export function paymobCallbackString(obj: Record<string, unknown>, style: BoolStyle = "words") {
  return hmacFields.map((field) => text(nested(obj, field), style)).join("");
}

export function paymobHmacHex(obj: Record<string, unknown>, secret: string, style: BoolStyle = "words") {
  return createHmac("sha512", secret).update(paymobCallbackString(obj, style)).digest("hex");
}

const boolStyles: BoolStyle[] = ["words", "python", "php", "bits"];

export function paymobSignatureMatches(obj: Record<string, unknown>, hmac: string, secret: string) {
  const given = hmac.trim().toLowerCase();
  return boolStyles.some((style) => sameHex(paymobHmacHex(obj, secret, style).toLowerCase(), given));
}

export function sameHex(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
