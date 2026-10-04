"use client";

import { useTransition } from "react";
import { completeMockAction } from "@/app/actions/payment";
import { formatMoney } from "@/lib/visa";

export function MockCheckout({
  token,
  name,
  amount,
  currency,
}: {
  token: string;
  name: string;
  amount: number;
  currency: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-line p-8 text-center shadow-float">
        <p className="text-xs tracking-wide text-muted-ink uppercase">Test checkout</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">{name}</h1>
        <p className="mt-2 text-lg">{formatMoney(amount, currency)}</p>
        <p className="mt-3 text-sm text-body">
          Stripe is not configured, so this is a simulated payment. Nothing is charged.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => completeMockAction(token))}
          className="mt-6 h-12 w-full rounded-full bg-brand font-medium text-white disabled:opacity-60"
        >
          {pending ? "Paying…" : "Pay now"}
        </button>
      </div>
    </div>
  );
}
