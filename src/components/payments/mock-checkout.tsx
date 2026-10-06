"use client";

import { useTransition } from "react";
import { completeMockAction } from "@/app/actions/payment";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
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
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-line p-8 text-center shadow-float">
        <p className="text-xs tracking-wide text-muted-ink uppercase">{t(locale, "pay.mock")}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">{name}</h1>
        <p className="mt-2 text-lg">{formatMoney(amount, currency, locale)}</p>
        <p className="mt-3 text-sm text-body">{t(locale, "pay.mockBody")}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => completeMockAction(token))}
          className="mt-6 h-12 w-full rounded-full bg-brand font-medium text-white disabled:opacity-60"
        >
          {pending ? t(locale, "pay.paying") : t(locale, "pay.now")}
        </button>
      </div>
    </div>
  );
}
