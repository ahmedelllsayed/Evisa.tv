import "server-only";
import { getSiteSettings } from "@/lib/data/settings";
import { operationsPulse, pingDatabase } from "@/lib/data/trust";
import { serverEnv } from "@/lib/env";
import { paymobReady } from "@/lib/paymob";

export type CheckState = "ok" | "warn" | "down";

export type LiveChecks = {
  database: { ok: boolean; ms: number | null };
  payments: { provider: "paymob" | "stripe" | null; production: boolean };
  email: { configured: boolean };
  pulse: { lastPaidAt: string | null; lastStaffUpdateAt: string | null } | null;
};

async function paymentProvider(): Promise<"paymob" | "stripe" | null> {
  try {
    const settings = await getSiteSettings().catch(() => null);
    const override = settings?.extras.paymobIntegrationId ? [settings.extras.paymobIntegrationId] : undefined;
    if (paymobReady(override)) return "paymob";
    if (serverEnv().stripeSecretKey) return "stripe";
  } catch {
    return null;
  }
  return null;
}

/** Only reports whether each integration is configured; no key or address is read into the page. */
export async function runLiveChecks(): Promise<LiveChecks> {
  const [database, provider] = await Promise.all([pingDatabase(), paymentProvider()]);
  const pulse = database.ok ? await operationsPulse().catch(() => null) : null;
  return {
    database,
    payments: { provider, production: process.env.NODE_ENV === "production" },
    email: { configured: Boolean(process.env.RESEND_API_KEY) },
    pulse,
  };
}
