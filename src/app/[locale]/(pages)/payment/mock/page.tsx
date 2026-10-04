import { notFound } from "next/navigation";
import { MockCheckout } from "@/components/payments/mock-checkout";
import { requireUser } from "@/lib/auth";
import { getApplication } from "@/lib/data/applications";
import type { Page } from "@/lib/page";

export default async function MockPaymentPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const id = token.split(".")[0];
  if (!id) notFound();
  const user = await requireUser(locale);
  const app = await getApplication(id);
  if (!app || app.userId !== user.id) notFound();
  return <MockCheckout token={token} name={`${app.destinationName} visa`} amount={app.totalAmount} currency={app.currency} />;
}
