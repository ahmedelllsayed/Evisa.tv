import { handleStripeWebhook } from "@/lib/payments";

export async function POST(request: Request) {
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature");
  const result = await handleStripeWebhook(raw, sig);
  return new Response(result.ok ? "ok" : "invalid", { status: result.status });
}
