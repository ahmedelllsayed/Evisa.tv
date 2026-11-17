import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { suppressAddress } from "@/lib/data/marketing/queue";

/** Svix signature check: base64 HMAC-SHA256 of `id.timestamp.body` with the decoded `whsec_` secret. */
function verified(secret: string, id: string, timestamp: string, signatures: string, body: string) {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  const body = await request.text();
  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signatures = request.headers.get("svix-signature") ?? "";
  if (!id || !timestamp || !signatures || !verified(secret, id, timestamp, signatures, body)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let event: { type?: string; data?: { to?: string[] | string; bounce?: { type?: string } } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const recipients = Array.isArray(event.data?.to) ? event.data.to : event.data?.to ? [event.data.to] : [];
  const transient = event.data?.bounce?.type?.toLowerCase() === "transient";
  const reason = event.type === "email.complained" ? "complaint" : event.type === "email.bounced" && !transient ? "bounce" : null;
  if (reason) {
    for (const address of recipients) await suppressAddress("email", address, reason);
  }
  return NextResponse.json({ ok: true });
}
