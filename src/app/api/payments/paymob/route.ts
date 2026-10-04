import { NextResponse } from "next/server";
import { handlePaymobWebhook } from "@/lib/paymob";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const raw = await request.text();
  const contentType = request.headers.get("content-type") ?? "";
  const normalized = normalizePaymobBody(raw, contentType);
  let hmac = url.searchParams.get("hmac");
  if (!hmac) {
    try {
      const body = JSON.parse(normalized) as { hmac?: string };
      hmac = typeof body.hmac === "string" ? body.hmac : null;
    } catch {
      hmac = null;
    }
  }
  const result = await handlePaymobWebhook(normalized, hmac);
  return new NextResponse(result.ok ? "ok" : "invalid", { status: result.status });
}

function normalizePaymobBody(raw: string, contentType: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;
  if (!contentType.includes("application/x-www-form-urlencoded") && !trimmed.startsWith("obj=")) return raw;
  const obj = new URLSearchParams(raw).get("obj");
  if (!obj) return raw;
  try {
    return JSON.stringify({ obj: JSON.parse(obj) });
  } catch {
    return raw;
  }
}
