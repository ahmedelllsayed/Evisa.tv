import { NextResponse } from "next/server";
import { handlePaymobWebhook } from "@/lib/paymob";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const raw = await request.text();
  const contentType = request.headers.get("content-type") ?? "";
  const normalized = normalizePaymobBody(raw, contentType);
  const hmac = url.searchParams.get("hmac") || normalized.hmac;
  const result = await handlePaymobWebhook(normalized.body, hmac);
  return new NextResponse(result.ok ? "ok" : "invalid", { status: result.status });
}

function normalizePaymobBody(raw: string, contentType: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return { body: trimmed, hmac: null as string | null };
  const form = contentType.includes("application/x-www-form-urlencoded") || trimmed.startsWith("obj=") || trimmed.includes("amount_cents=");
  if (!form) return { body: raw, hmac: null as string | null };
  const params = new URLSearchParams(raw);
  const hmac = params.get("hmac");
  const obj = params.get("obj");
  if (!obj) {
    const fields: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      if (key === "hmac") continue;
      fields[key] = value;
    }
    return { body: JSON.stringify(fields), hmac };
  }
  try {
    return { body: JSON.stringify({ obj: JSON.parse(obj) }), hmac };
  } catch {
    return { body: raw, hmac };
  }
}
