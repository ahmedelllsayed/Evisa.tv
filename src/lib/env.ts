import "server-only";

export { env, supabaseEnabled } from "@/lib/public-env";

export function serverEnv() {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  const integrationIds = (process.env.PAYMOB_INTEGRATION_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return {
    authSecret: authSecret || "local-development-secret",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    adminEmails: (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    paymob: {
      secretKey: process.env.PAYMOB_SECRET_KEY ?? "",
      publicKey: process.env.PAYMOB_PUBLIC_KEY ?? "",
      apiKey: process.env.PAYMOB_API_KEY ?? "",
      hmacSecret: process.env.PAYMOB_HMAC_SECRET ?? "",
      integrationIds,
      baseUrl: (process.env.PAYMOB_BASE_URL || "https://accept.paymob.com").replace(/\/$/, ""),
      checkoutUrl: process.env.PAYMOB_CHECKOUT_URL || "https://eg.checkout.paymob.com/",
    },
  };
}
