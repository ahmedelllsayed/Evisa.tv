"use client";

import { useState, useTransition } from "react";
import { googleAction, sendCodeAction, verifyCodeAction } from "@/app/actions/auth";
import { t } from "@/lib/i18n";

export function SignInForm({ locale, next, googleEnabled }: { locale: string; next: string; googleEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-3xl border border-line p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand">
            <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 4v2h16v-2c0-2.3-4.7-4-8-4Z" />
            </svg>
          </span>
          <h1 className="font-display text-xl leading-snug font-semibold text-brand">
            {t(locale, "signIn.title")}
            <span className="block font-normal text-ink">{t(locale, "signIn.subtitle")}</span>
          </h1>
        </div>
        {!sent ? (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await sendCodeAction(email, locale);
                if (!res.ok) setError(res.error);
                else {
                  setSent(true);
                  setDevCode(res.devCode);
                }
              });
            }}
          >
            <label className="block text-sm font-medium">
              {t(locale, "signIn.email")}
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abc@example.com"
                className="mt-2 h-12 w-full rounded-xl border border-line-strong px-3"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={pending} className="h-12 w-full rounded-xl bg-brand font-medium text-white disabled:opacity-60">
              {t(locale, "signIn.send")}
            </button>
          </form>
        ) : (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await verifyCodeAction(email, code, next, locale);
                if (res && !res.ok) setError(res.error);
              });
            }}
          >
            <p className="text-sm text-body">{t(locale, "signIn.codeSent")}</p>
            {devCode && (
              <p className="rounded-xl bg-surface px-3 py-2 text-xs text-slate-ink">
                Dev code: <span className="font-mono font-semibold">{devCode}</span>
              </p>
            )}
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 w-full rounded-xl border border-line-strong px-3 tracking-[0.4em]"
              maxLength={6}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={pending} className="h-12 w-full rounded-full bg-brand font-medium text-white disabled:opacity-60">
              {t(locale, "signIn.verify")}
            </button>
            <button type="button" className="w-full text-sm text-muted-ink" onClick={() => setSent(false)}>
              {t(locale, "signIn.different")}
            </button>
          </form>
        )}
        {googleEnabled && (
          <>
            <p className="my-5 text-center text-xs tracking-wide text-muted-ink uppercase">{t(locale, "signIn.or")}</p>
            <button
              type="button"
              onClick={() => start(() => void googleAction(next))}
              className="mx-auto flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium"
            >
              {t(locale, "signIn.google")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
