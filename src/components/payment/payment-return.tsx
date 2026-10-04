import Link from "next/link";
import { paymentReturn } from "@/lib/payments";
import { href } from "@/lib/href";

export async function PaymentReturn({ locale, merchantOrderId }: { locale: string; merchantOrderId: string }) {
  const view = await paymentReturn(merchantOrderId);
  const paid = view.state === "paid";
  const failed = view.state === "failed";
  const title = paid ? "Payment received" : failed ? "Payment was not completed" : "Payment is being confirmed";
  const body = paid
    ? view.app
      ? `Your ${view.app.destinationName} application ${view.app.reference} is now being processed.`
      : "Your application is now being processed. Sign in to track it."
    : failed
      ? "The payment did not go through. You can return to the application and try again."
      : "We are waiting for the payment provider to confirm this transaction. This page is not the confirmation.";
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-body">{body}</p>
      {paid && view.app ? (
        <Link
          href={href(`/account/applications/${view.app.id}`, locale)}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-medium text-white"
        >
          Track application
        </Link>
      ) : (
        <Link href={href("/account", locale)} className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-medium text-white">
          Go to your account
        </Link>
      )}
    </div>
  );
}
