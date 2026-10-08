import Link from "next/link";
import { PurchaseBeacon } from "@/components/analytics/purchase-beacon";
import { getCurrentUser } from "@/lib/auth";
import { completeStripeSession } from "@/lib/payments";
import { getApplication } from "@/lib/data/applications";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

export default async function PaymentSuccessPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  const confirmed = sessionId ? Boolean(await completeStripeSession(sessionId)) : true;
  const appId = typeof sp.app === "string" ? sp.app : "";
  const app = confirmed && appId ? await getApplication(appId) : null;
  const user = await getCurrentUser();
  const visible = app && user && (user.id === app.userId || user.role === "admin") ? app : null;
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {visible?.paidAt && <PurchaseBeacon id={visible.id} value={visible.totalAmount} currency={visible.currency} />}
      <h1 className="font-display text-3xl font-semibold">{confirmed ? "Payment received" : "Payment was not completed"}</h1>
      <p className="mt-3 text-body">
        {visible
          ? `Your ${visible.destinationName} application ${visible.reference} is now being processed.`
          : confirmed
            ? "If the payment succeeded, your application is now being processed. Sign in to track it."
            : "The payment was not confirmed. Return to your application and try again."}
      </p>
      {visible && (
        <Link
          href={href(`/account/applications/${visible.id}`, locale)}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-medium text-white"
        >
          Track application
        </Link>
      )}
    </div>
  );
}
