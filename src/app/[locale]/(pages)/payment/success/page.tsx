import Link from "next/link";
import { PurchaseBeacon } from "@/components/analytics/purchase-beacon";
import { OfferCard } from "@/components/account/offer-card";
import { ResultPane } from "@/components/motion/frame";
import { getCurrentUser } from "@/lib/auth";
import { completeStripeSession } from "@/lib/payments";
import { getApplication } from "@/lib/data/applications";
import { getSiteSettings } from "@/lib/data/settings";
import { href } from "@/lib/href";
import { isArabicLocale, t, tf } from "@/lib/i18n";
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
  const settings = confirmed ? await getSiteSettings() : null;
  const arabic = isArabicLocale(locale);
  const body = visible
    ? tf(locale, "payment.named", { name: visible.destinationName, ref: visible.reference })
    : confirmed
      ? t(locale, "payment.signedOut")
      : t(locale, "payment.failedBody");
  const steps = arabic
    ? ["يراجع أحد الموظفين الملف.", "التقديم على الجهة يتم يدوياً بعد المراجعة.", "ملف التأشيرة يظهر في صفحة التتبع عند إرفاقه."]
    : ["A staff member reviews the file.", "Filing with the authority is done by hand after that review.", "The visa file appears on the tracker when we attach it."];
  return (
    <div className={arabic ? "surface-ar" : ""}>
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
      {confirmed ? (
        <ol className="mx-auto mt-4 w-full max-w-md space-y-2 px-4 text-sm text-[#16182b]">
          {steps.map((step, index) => (
            <li key={step} className="rounded-2xl border border-[#e3e5f2] bg-white px-4 py-3">
              <span className="font-semibold text-brand">{index + 1}. </span>
              {step}
            </li>
          ))}
        </ol>
      ) : null}
      {settings ? <OfferCard locale={locale} extras={settings.extras} /> : null}
    </div>
  );
}

