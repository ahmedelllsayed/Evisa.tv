"use client";

import { useState, useTransition } from "react";
import { sendContactAction } from "@/app/actions/inbox";
import { t } from "@/lib/i18n";

export function ContactForm({ locale }: { locale: string }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) return <p className="mt-8 text-sm">{t(locale, "contact.sent")}</p>;

  return (
    <form
      className="mt-8 grid max-w-xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          const result = await sendContactAction({
            locale,
            name: String(data.get("name") ?? ""),
            email: String(data.get("email") ?? ""),
            topic: String(data.get("topic") ?? ""),
            body: String(data.get("message") ?? ""),
          });
          if (!result.ok) setError(result.error);
          else setSent(true);
        });
      }}
    >
      <label className="text-sm font-medium">
        {t(locale, "contact.name")}
        <input required name="name" className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
      </label>
      <label className="text-sm font-medium">
        {t(locale, "contact.email")}
        <input required type="email" name="email" className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
      </label>
      <label className="text-sm font-medium">
        {t(locale, "contact.topic")}
        <input name="topic" className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
      </label>
      <label className="text-sm font-medium">
        {t(locale, "contact.message")}
        <textarea required minLength={10} name="message" className="mt-1 min-h-28 w-full rounded-xl border border-line px-3 py-2" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="h-11 w-fit rounded-full bg-brand px-5 text-sm font-medium text-white disabled:opacity-60">
        {t(locale, "contact.send")}
      </button>
    </form>
  );
}
