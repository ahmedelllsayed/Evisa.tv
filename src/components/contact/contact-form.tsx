"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { sendContactAction, type ContactField } from "@/app/actions/inbox";
import { track } from "@/lib/analytics";
import { href } from "@/lib/href";
import { isArabicLocale, t } from "@/lib/i18n";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";
import { CONTACT_TOPICS, topicCopy, type ContactTopic } from "./topics";

export type ContactApplicationOption = { id: string; reference: string; label: string };

const inputClass =
  "mt-1.5 h-11 w-full min-w-0 rounded-xl border border-[#e3e5f2] bg-white px-3 text-sm text-[#16182b] outline-none transition-colors placeholder:text-muted-ink/70 focus:border-brand focus:ring-2 focus:ring-brand-100 aria-invalid:border-rose-400";
const MAX_BODY = 4000;

export function ContactForm({
  locale,
  initialTopic = "general",
  lockTopic = false,
  heading,
  user = null,
  applications = [],
  initialApplicationId = "",
  partnershipsEmail = "",
  responseNote,
  returnPath = "/contact",
}: {
  locale: string;
  initialTopic?: ContactTopic;
  lockTopic?: boolean;
  heading?: string;
  user?: { name: string; email: string } | null;
  applications?: ContactApplicationOption[];
  initialApplicationId?: string;
  partnershipsEmail?: string;
  responseNote?: string;
  returnPath?: string;
}) {
  const id = useId();
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<{ name: string; email: string; reference: string | null; applicationId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<ContactField, string>>>({});
  const [length, setLength] = useState(0);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  const copy = topicCopy[topic];
  const arabic = isArabicLocale(locale);
  const fieldError = (name: ContactField) =>
    fields[name] ? (
      <p id={`${id}-${name}-error`} className="mt-1 text-xs font-medium text-rose-600">
        {fields[name]}
      </p>
    ) : null;
  const describe = (name: ContactField) => (fields[name] ? `${id}-${name}-error` : undefined);

  if (sent) {
    const linkedApp = sent.reference ? applications.find((app) => app.reference === sent.reference) : null;
    return (
      <div role="status" className="min-w-0 rounded-[26px] border border-[#e3e5f2] bg-white p-6 md:p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h3 ref={doneRef} tabIndex={-1} className="mt-4 text-xl font-semibold text-[#16182b] outline-none">
          {say(locale, "Message received", "وصلت رسالتك")}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-body">
          {say(locale, `Thanks, ${sent.name}. The reply will go to `, `شكراً يا ${sent.name}. سيصلك الرد على `)}
          <bdi dir="ltr" className="font-medium text-[#16182b]">
            {sent.email}
          </bdi>
          .
        </p>
        {sent.reference ? (
          <p className="mt-2 text-sm text-body">
            {say(locale, "Linked to application ", "مرتبطة بالطلب ")}
            {linkedApp ? (
              <Link href={href(`/account/applications/${sent.applicationId}`, locale)} dir="ltr" className="font-semibold text-brand-700 hover:underline">
                {sent.reference}
              </Link>
            ) : (
              <span dir="ltr" className="font-semibold">
                {sent.reference}
              </span>
            )}
          </p>
        ) : null}
        {lockTopic ? null : (
          <>
            <p className="mt-6 text-xs font-semibold text-muted-ink">{say(locale, "What happens next", "ماذا يحدث الآن")}</p>
            <ol className="mt-3 space-y-3">
              {[
                say(locale, "A staff member reads your message in the inbox.", "يقرأ أحد الموظفين رسالتك في صندوق الرسائل."),
                say(locale, "The answer comes by email from our team.", "يصلك الرد بالبريد من فريقنا."),
                say(locale, "Check your spam folder if you do not see it.", "راجع مجلد الرسائل غير المرغوبة إن لم تجده."),
              ].map((line, index) => (
                <li key={line} className="flex gap-3 text-sm text-body">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{index + 1}</span>
                  <span className="pt-0.5">{line}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        {responseNote ? <p className="mt-5 text-sm text-muted-ink">{responseNote}</p> : null}
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setLength(0);
          }}
          className="mt-6 inline-flex h-11 items-center rounded-full border border-[#e3e5f2] bg-white px-5 text-sm font-semibold text-[#16182b] hover:border-brand-200"
        >
          {say(locale, "Send another message", "إرسال رسالة أخرى")}
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="relative min-w-0 rounded-[26px] border border-[#e3e5f2] bg-white p-5 md:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = (key: string) => String(data.get(key) ?? "");
        setError(null);
        start(async () => {
          const result = await sendContactAction({
            locale,
            name: value("name"),
            email: value("email"),
            topic,
            body: value("message"),
            applicationId: value("applicationId"),
            travelDate: value("travelDate"),
            website: value("website"),
          });
          if (!result.ok) {
            setError(result.error);
            setFields(result.fields);
            requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
            return;
          }
          track("generate_lead", { method: "contact" });
          setFields({});
          setSent({ name: value("name").trim(), email: value("email").trim(), reference: result.reference, applicationId: value("applicationId") });
        });
      }}
    >
      {heading ? <h2 className="text-lg font-semibold text-[#16182b] md:text-xl">{heading}</h2> : null}

      {lockTopic ? null : (
        <fieldset className={cn(heading && "mt-4")}>
          <legend className="text-sm font-medium text-[#16182b]">{say(locale, "Topic", "الموضوع")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTACT_TOPICS.map((option) => (
              <label
                key={option}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-brand-200",
                  option === topic ? "border-[#16182b] bg-[#16182b] font-medium text-white" : "border-[#e3e5f2] bg-white text-[#16182b] hover:border-brand-200",
                )}
              >
                <input type="radio" name="topic" value={option} checked={option === topic} onChange={() => setTopic(option)} className="sr-only" />
                {arabic ? topicCopy[option].ar : topicCopy[option].en}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={cn("rounded-[18px] bg-brand-50/70 px-4 py-3.5 ring-1 ring-brand-100 ring-inset", lockTopic ? (heading ? "mt-4" : "") : "mt-4")}>
        <p className="text-xs font-semibold text-brand-700">{lockTopic ? say(locale, "Tip", "تنبيه") : say(locale, "Quick answer", "إجابة سريعة")}</p>
        <p className="mt-1 text-sm leading-relaxed text-[#16182b]">{arabic ? copy.helpAr : copy.helpEn}</p>
        {!lockTopic && (copy.links.length > 0 || (topic === "partnership" && partnershipsEmail)) ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {copy.links.map((link) => (
              <Link
                key={link.path}
                href={href(link.path, locale)}
                className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 ring-inset hover:ring-brand-200"
              >
                {arabic ? link.ar : link.en}
              </Link>
            ))}
            {topic === "partnership" && partnershipsEmail ? (
              <a
                href={`mailto:${partnershipsEmail}`}
                dir="ltr"
                className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 ring-inset hover:ring-brand-200"
              >
                {partnershipsEmail}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {user && applications.length ? (
        <label className="mt-5 block text-sm font-medium text-[#16182b]">
          {say(locale, "Related application", "الطلب المرتبط")} <span className="font-normal text-muted-ink">{say(locale, "(optional)", "(اختياري)")}</span>
          <select
            name="applicationId"
            defaultValue={initialApplicationId}
            aria-invalid={fields.applicationId ? true : undefined}
            aria-describedby={describe("applicationId")}
            className={inputClass}
          >
            <option value="">{say(locale, "Not about a specific application", "ليست عن طلب محدد")}</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.label}
              </option>
            ))}
          </select>
          {fieldError("applicationId")}
        </label>
      ) : !user ? (
        <p className="mt-4 text-xs text-muted-ink">
          {say(locale, "Have an account? ", "لديك حساب؟ ")}
          <Link href={href(`/sign-in?next=${encodeURIComponent(href(returnPath, locale))}`, locale)} className="font-semibold text-brand-700 hover:underline">
            {say(locale, "Sign in", "سجّل الدخول")}
          </Link>
          {say(locale, " to link the message to your application.", " لربط الرسالة بطلبك.")}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0 text-sm font-medium text-[#16182b]">
          {t(locale, "contact.name")}
          <input
            name="name"
            autoComplete="name"
            defaultValue={user?.name ?? ""}
            aria-invalid={fields.name ? true : undefined}
            aria-describedby={describe("name")}
            className={inputClass}
          />
          {fieldError("name")}
        </label>
        <label className="block min-w-0 text-sm font-medium text-[#16182b]">
          {t(locale, "contact.email")}
          <input
            name="email"
            type="email"
            dir="ltr"
            inputMode="email"
            autoComplete="email"
            defaultValue={user?.email ?? ""}
            aria-invalid={fields.email ? true : undefined}
            aria-describedby={describe("email")}
            className={cn(inputClass, "text-start rtl:text-end")}
          />
          {fieldError("email")}
        </label>
      </div>

      {topic === "urgent" ? (
        <label className="mt-4 block text-sm font-medium text-[#16182b]">
          {say(locale, "Travel date", "موعد السفر")} <span className="font-normal text-muted-ink">{say(locale, "(optional)", "(اختياري)")}</span>
          <input
            name="travelDate"
            type="date"
            aria-invalid={fields.travelDate ? true : undefined}
            aria-describedby={describe("travelDate")}
            className={cn(inputClass, "sm:max-w-xs")}
          />
          {fieldError("travelDate")}
        </label>
      ) : null}

      <label className="mt-4 block text-sm font-medium text-[#16182b]">
        {t(locale, "contact.message")}
        <textarea
          name="message"
          rows={5}
          maxLength={MAX_BODY}
          placeholder={arabic ? copy.placeholderAr : copy.placeholderEn}
          onChange={(event) => setLength(event.currentTarget.value.length)}
          aria-invalid={fields.body ? true : undefined}
          aria-describedby={describe("body")}
          className={cn(inputClass, "h-auto min-h-32 resize-y py-2.5 leading-relaxed")}
        />
        <span className="mt-1 flex items-start justify-between gap-3">
          <span className="min-w-0">{fieldError("body")}</span>
          <span className={cn("shrink-0 text-xs font-normal tabular-nums", length > MAX_BODY - 200 ? "text-amber-700" : "text-muted-ink")}>
            {length}/{MAX_BODY}
          </span>
        </span>
      </label>

      <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200 ring-inset">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? say(locale, "Sending…", "جارٍ الإرسال…") : t(locale, "contact.send")}
        </button>
        {responseNote ? <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-ink">{responseNote}</p> : null}
      </div>
    </form>
  );
}
