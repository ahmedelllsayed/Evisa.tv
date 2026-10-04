import "server-only";
import { getSiteSettings } from "@/lib/data/settings";

/** Sends through Resend when RESEND_API_KEY is set. Otherwise the caller keeps the local fallback. */
export async function sendMail(input: { to: string; subject: string; text: string; idempotencyKey?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false as const };
  const settings = await getSiteSettings();
  const from = process.env.RESEND_FROM || `${settings.name} <onboarding@resend.dev>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
  });
  if (!res.ok) {
    console.error("[email]", res.status, await res.text());
    return { sent: false as const };
  }
  return { sent: true as const };
}
