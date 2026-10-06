import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { siteConfig } from "@/config/site.config";
import { getSiteSettings } from "@/lib/data/settings";
import { createPayment, findPendingPayment, getApplication, getPaymentByMerchantOrder, getPaymentByProviderRef, listPayments, markPaid, markRefunded } from "@/lib/data/applications";
import { getCurrentUser } from "@/lib/auth";
import { env, serverEnv } from "@/lib/env";
import { createPaymobIntention, paymobReady, refundPaymob } from "@/lib/paymob";
import type { Application, Payment, User } from "@/lib/types";

function mockSign(payload: string) {
  return createHmac("sha256", serverEnv().authSecret).update(payload).digest("hex");
}

function reusableCheckoutUrl(payment: Payment, locale: string) {
  if (payment.checkoutUrl) return payment.checkoutUrl;
  if (payment.provider === "mock" && payment.providerRef) {
    return `/${locale}/payment/mock?token=${encodeURIComponent(payment.providerRef)}`;
  }
  return null;
}

export async function createCheckout(application: Application, locale: string, customer: Pick<User, "fullName" | "email" | "phone">) {
  const fresh = await getApplication(application.id);
  if (!fresh) return { ok: false as const, error: "Application not found." };
  if (fresh.status !== "draft" && fresh.status !== "payment_pending") {
    return { ok: false as const, error: "This application can no longer be paid." };
  }
  const pending = await findPendingPayment(fresh.id);
  if (pending) {
    const sameAmount = Math.abs(pending.amount - fresh.totalAmount) < 0.01 && pending.currency.toUpperCase() === fresh.currency.toUpperCase();
    const url = sameAmount ? reusableCheckoutUrl(pending, locale) : null;
    if (url) return { ok: true as const, url };
    return { ok: false as const, error: "A payment is already in progress for this application." };
  }
  const settings = await getSiteSettings();
  const success = `${env.siteUrl}/${locale}/payment/success?app=${fresh.id}`;
  const cancel = `${env.siteUrl}/${locale}/apply/${fresh.id}`;
  if (paymobReady()) {
    const phone = (customer.phone || "").trim();
    if (!phone) return { ok: false as const, error: "Add a phone number on your profile before paying." };
    const merchantOrderId = `${fresh.reference}-${randomUUID().slice(0, 8)}`;
    const amountCents = Math.round(fresh.totalAmount * 100);
    const intention = await createPaymobIntention({
      amountCents,
      currency: fresh.currency || "EGP",
      merchantOrderId,
      description: `${fresh.destinationName} visa ${fresh.reference}`,
      billing: { name: customer.fullName || customer.email, email: customer.email, phone },
      notificationUrl: `${env.siteUrl}/api/payments/paymob`,
      redirectionUrl: `${env.siteUrl}/${locale}/payment/result`,
    });
    if (!intention.ok) return intention;
    await createPayment({
      applicationId: fresh.id,
      provider: "paymob",
      providerRef: merchantOrderId,
      amount: fresh.totalAmount,
      currency: fresh.currency,
      merchantOrderId,
      paymobOrderId: intention.paymobOrderId,
      billingName: customer.fullName,
      billingEmail: customer.email,
      billingPhone: phone,
      checkoutUrl: intention.url,
    });
    return { ok: true as const, url: intention.url };
  }
  const stripeKey = serverEnv().stripeSecretKey;
  if (stripeKey) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${success}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel,
      customer_email: fresh.userEmail,
      metadata: { applicationId: fresh.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: fresh.currency.toLowerCase(),
            unit_amount: Math.round(fresh.totalAmount * 100),
            product_data: {
              name: `${fresh.destinationName} visa — ${fresh.reference}`,
              description: `${settings.name} government + processing fees`,
            },
          },
        },
      ],
    });
    const url = session.url;
    if (!url) return { ok: false as const, error: "Could not start the payment." };
    await createPayment({
      applicationId: fresh.id,
      provider: "stripe",
      providerRef: session.id,
      amount: fresh.totalAmount,
      currency: fresh.currency,
      checkoutUrl: url,
    });
    return { ok: true as const, url };
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false as const, error: "Payments are not configured." };
  }
  const token = `${fresh.id}.${mockSign(fresh.id)}`;
  const url = `/${locale}/payment/mock?token=${encodeURIComponent(token)}`;
  await createPayment({
    applicationId: fresh.id,
    provider: "mock",
    providerRef: token,
    amount: fresh.totalAmount,
    currency: fresh.currency,
    checkoutUrl: url,
  });
  return { ok: true as const, url };
}

export async function completeMockCheckout(token: string) {
  if (process.env.NODE_ENV === "production") return { ok: false as const, error: "Test checkout is disabled." };
  const [id, sig] = token.split(".");
  const expected = id ? mockSign(id) : "";
  const given = Buffer.from(sig ?? "");
  const wanted = Buffer.from(expected);
  if (!id || given.length !== wanted.length || !timingSafeEqual(given, wanted)) return { ok: false as const, error: "Invalid payment token" };
  const app = await getApplication(id);
  if (!app) return { ok: false as const, error: "Invalid payment token" };
  const user = await getCurrentUser();
  if (!user || (user.id !== app.userId && user.role !== "admin")) return { ok: false as const, error: "Invalid payment token" };
  const paid = await markPaid("mock", token, app.totalAmount);
  if (!paid) return { ok: false as const, error: "Payment could not be confirmed." };
  return { ok: true as const, applicationId: id, locale: siteConfig.defaultLocale, app };
}

async function confirmStripe(sessionId: string) {
  const stripeKey = serverEnv().stripeSecretKey;
  if (!stripeKey) return false;
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" || session.amount_total == null) return false;
  const payment = await getPaymentByProviderRef("stripe", session.id);
  if (!payment) return false;
  if (session.metadata?.applicationId && session.metadata.applicationId !== payment.applicationId) return false;
  return markPaid("stripe", session.id, session.amount_total / 100);
}

export async function completeStripeSession(sessionId: string) {
  return confirmStripe(sessionId);
}

export async function handleStripeWebhook(rawBody: string, signature: string | null) {
  const secret = serverEnv().stripeWebhookSecret;
  const stripeKey = serverEnv().stripeSecretKey;
  if (!secret || !stripeKey || !signature) return { ok: false, status: 400 };
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey);
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return { ok: false, status: 400 };
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string };
    await confirmStripe(session.id);
  }
  return { ok: true, status: 200 };
}

export async function paymentReturn(merchantOrderId: string) {
  if (!merchantOrderId) return { state: "unknown" as const, app: null };
  const payment = await getPaymentByMerchantOrder(merchantOrderId);
  if (!payment) return { state: "unknown" as const, app: null };
  const user = await getCurrentUser();
  const application = await getApplication(payment.applicationId);
  const visible = Boolean(application && user && (user.id === application.userId || user.role === "admin"));
  return {
    state: payment.status,
    app: visible && application ? { id: application.id, destinationName: application.destinationName, reference: application.reference } : null,
  };
}

/** Marks the paid charge refunded. A Stripe payment is refunded on Stripe first. */
export async function refundApplication(applicationId: string) {
  const payments = await listPayments(applicationId);
  const paid = payments.find((payment) => payment.status === "paid");
  if (!paid) return { ok: false as const, error: "لا توجد دفعة مكتملة للاسترداد." };
  if (paid.provider === "paymob") {
    if (!paid.transactionId) return { ok: false as const, error: "دفعة Paymob بلا رقم عملية." };
    const refunded = await refundPaymob(paid.transactionId, Math.round(paid.amount * 100));
    if (!refunded.ok) return refunded;
  }
  if (paid.provider === "stripe") {
    const stripeKey = serverEnv().stripeSecretKey;
    if (!stripeKey || !paid.providerRef) return { ok: false as const, error: "تعذر تنفيذ استرداد Stripe." };
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);
    try {
      const session = await stripe.checkout.sessions.retrieve(paid.providerRef);
      const intent = session.payment_intent;
      const paymentIntent = typeof intent === "string" ? intent : intent?.id;
      if (!paymentIntent) return { ok: false as const, error: "جلسة Stripe بلا عملية دفع." };
      await stripe.refunds.create({ payment_intent: paymentIntent });
    } catch {
      return { ok: false as const, error: "تعذر تنفيذ استرداد Stripe." };
    }
  }
  return markRefunded(applicationId, paid.id);
}
