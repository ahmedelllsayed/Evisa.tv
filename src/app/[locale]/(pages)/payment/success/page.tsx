import Link from "next/link";
import { PurchaseBeacon } from "@/components/analytics/purchase-beacon";
import { ResultPane, surfaceClass } from "@/components/motion/frame";
import { getCurrentUser } from "@/lib/auth";
import { completeStripeSession } from "@/lib/payments";
import { getApplication } from "@/lib/data/applications";
import { href } from "@/lib/href";
import { t, tf } from "@/lib/i18n";
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
  const body = visible
    ? tf(locale, "payment.named", { name: visible.destinationName, ref: visible.reference })
    : confirmed
      ? t(locale, "payment.signedOut")
      : t(locale, "payment.failedBody");
  return (
    <div className={surfaceClass(locale)}>
      {visible?.paidAt && <PurchaseBeacon id={visible.id} value={visible.totalAmount} currency={visible.currency} />}
      <ResultPane
        title={confirmed ? t(locale, "payment.received") : t(locale, "payment.failed")}
        body={body}
        tone={confirmed ? "paid" : "failed"}
        action={
          visible ? (
            <Link href={href(`/account/applications/${visible.id}`, locale)} className="inline-flex h-12 items-center rounded-full bg-brand px-6 font-semibold text-white">
              {t(locale, "payment.track")}
            </Link>
          ) : null
        }
      />
    </div>
  );
}
