import { EventBeacon } from "@/components/analytics/purchase-beacon";
import { PaymentReturn } from "@/components/payment/payment-return";
import type { Page } from "@/lib/page";

export default async function PaymobFailedPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const merchantOrderId = typeof sp.merchant_order_id === "string" ? sp.merchant_order_id : "";
  return (
    <>
      <EventBeacon name="payment_failed" />
      <PaymentReturn locale={locale} merchantOrderId={merchantOrderId} />
    </>
  );
}
