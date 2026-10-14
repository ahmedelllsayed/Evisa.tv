import Link from "next/link";
import { ResultPane, surfaceClass } from "@/components/motion/frame";
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
  const action = paid && view.app ? (
    <Link href={href(`/account/applications/${view.app.id}`, locale)} className="inline-flex h-12 items-center rounded-full bg-brand px-6 font-semibold text-white">
      {t(locale, "payment.track")}
    </Link>
  ) : (
    <Link href={href("/account", locale)} className="inline-flex h-12 items-center rounded-full bg-brand px-6 font-semibold text-white">
      {t(locale, "payment.account")}
    </Link>
  );
  return (
    <div className={surfaceClass(locale)}>
      <ResultPane title={title} body={body} action={action} tone={paid ? "paid" : failed ? "failed" : "plain"} />
    </div>
  );
}
