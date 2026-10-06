import Link from "next/link";
import { paymentReturn } from "@/lib/payments";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";

export async function PaymentReturn({ locale, merchantOrderId }: { locale: string; merchantOrderId: string }) {
  const view = await paymentReturn(merchantOrderId);
  const paid = view.state === "paid";
  const failed = view.state === "failed";
  const title = paid ? t(locale, "payment.received") : failed ? t(locale, "payment.failed") : t(locale, "payment.pending");
  const body = paid
    ? view.app
      ? `${view.app.reference}. ${t(locale, "payment.receivedBody")}`
      : t(locale, "payment.receivedBody")
    : failed
      ? t(locale, "payment.failedBody")
      : t(locale, "payment.pendingBody");
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-body">{body}</p>
      {paid && view.app ? (
        <Link
          href={href(`/account/applications/${view.app.id}`, locale)}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-medium text-white"
        >
          {t(locale, "payment.track")}
        </Link>
      ) : (
        <Link href={href("/account", locale)} className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-medium text-white">
          {t(locale, "payment.account")}
        </Link>
      )}
    </div>
  );
}
