"use client";

import { CheckCircle2, IdCard, LoaderCircle, Lock, Phone, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import { PrivacyNote, ProfileChecklist } from "@/components/account/profile/checklist";
import { docTargetId, ProfileDocuments } from "@/components/account/profile/documents";
import {
  completeness,
  expiryHealth,
  formatDay,
  profileErrors,
  profileFields,
  sameProfile,
  shiftDays,
  shiftYears,
  type ProfileErrors,
  type ProfileField,
  type ProfileValues,
} from "@/components/account/profile/rules";
import { BackLink, cardClass, inputClass, say, SectionTitle } from "@/components/account/ui";
import { Heading } from "@/components/motion/frame";
import type { ProfileItem } from "@/lib/account-insights";
import { href } from "@/lib/href";
import { isArabicLocale, t } from "@/lib/i18n";
import type { ProfileVault } from "@/lib/profile";
import { cn } from "@/lib/utils";

type Option = { code: string; name: string };

const ltrInput = "rtl:text-right";

function valuesOf(vault: ProfileVault): ProfileValues {
  return {
    firstName: vault.firstName,
    lastName: vault.lastName,
    phone: vault.phone,
    sex: vault.sex,
    dateOfBirth: vault.dateOfBirth,
    nationality: vault.nationality,
    passportNumber: vault.passportNumber,
    passportExpiry: vault.passportExpiry,
  };
}

function fieldId(field: ProfileField) {
  return `profile-${field}`;
}

function focusTarget(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.focus({ preventScroll: true });
}

function ageOn(dateOfBirth: string, today: string) {
  const years = Number(today.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  return today.slice(5) >= dateOfBirth.slice(5) ? years : years - 1;
}

function attentionText(locale: string, count: number) {
  if (!isArabicLocale(locale)) return count === 1 ? "1 field needs attention" : `${count} fields need attention`;
  if (count === 1) return "حقل يحتاج إلى مراجعة";
  if (count === 2) return "حقلان يحتاجان إلى مراجعة";
  return count <= 10 ? `${count} حقول تحتاج إلى مراجعة` : `${count} حقلاً تحتاج إلى مراجعة`;
}

export function ProfileForm({
  locale,
  email,
  vault,
  today,
  nationalities,
}: {
  locale: string;
  email: string;
  vault: ProfileVault;
  today: string;
  nationalities: Option[];
}) {
  const [saved, setSaved] = useState(() => valuesOf(vault));
  const [values, setValues] = useState(saved);
  const [touched, setTouched] = useState<Partial<Record<ProfileField, boolean>>>({});
  const [revealAll, setRevealAll] = useState(false);
  const [serverErrors, setServerErrors] = useState<ProfileErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const noticeCount = useRef(0);
  const [pending, start] = useTransition();

  const errors = useMemo(() => profileErrors(values, today, locale), [values, today, locale]);
  const invalid = profileFields.filter((field) => errors[field]);
  const dirty = !sameProfile(values, saved);
  const progress = completeness(
    values,
    errors,
    vault.documents.map((doc) => doc.kind),
  );

  function shownError(field: ProfileField) {
    return serverErrors[field] ?? (touched[field] || revealAll ? errors[field] : undefined);
  }

  function announce(text: string) {
    noticeCount.current += 1;
    setNotice({ id: noticeCount.current, text });
  }

  function update(field: ProfileField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFailure(null);
    setServerErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function control(field: ProfileField) {
    const error = shownError(field);
    return {
      id: fieldId(field),
      name: field,
      value: values[field],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => update(field, event.target.value),
      onBlur: () => setTouched((current) => (current[field] ? current : { ...current, [field]: true })),
      "aria-invalid": error ? true : undefined,
      "aria-describedby": `${fieldId(field)}-${error ? "error" : "hint"}`,
    };
  }

  function reveal() {
    setRevealAll(true);
    if (invalid[0]) focusTarget(fieldId(invalid[0]));
  }

  function save() {
    if (!dirty || pending) return;
    if (invalid.length) {
      reveal();
      return;
    }
    const fd = new FormData();
    for (const field of profileFields) fd.set(field, values[field]);
    setFailure(null);
    start(async () => {
      const result = await updateProfileAction(locale, fd);
      if (!result.ok) {
        setServerErrors(result.fields ?? {});
        setRevealAll(true);
        setFailure(result.error);
        return;
      }
      setSaved(result.values);
      setValues(result.values);
      setTouched({});
      setRevealAll(false);
      setServerErrors({});
      announce(t(locale, "profile.saved"));
    });
  }

  function discard() {
    setValues(saved);
    setTouched({});
    setRevealAll(false);
    setServerErrors({});
    setFailure(null);
  }

  function jump(item: ProfileItem) {
    const targets: Record<ProfileItem, string> = {
      name: fieldId(errors.firstName || !values.firstName.trim() ? "firstName" : "lastName"),
      birth: fieldId("dateOfBirth"),
      nationality: fieldId("nationality"),
      passport: fieldId("passportNumber"),
      expiry: fieldId("passportExpiry"),
      phone: fieldId("phone"),
      scan: docTargetId("passport"),
      photo: docTargetId("photo"),
    };
    setTouched((current) => ({ ...current, ...(item === "name" ? { firstName: true, lastName: true } : {}) }));
    focusTarget(targets[item]);
  }

  function guardLeave(event: MouseEvent) {
    if (dirty && !window.confirm(say(locale, "Leave without saving your changes?", "هل تريد المغادرة دون حفظ التغييرات؟"))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const health = values.passportExpiry && !errors.passportExpiry ? expiryHealth(values.passportExpiry, today) : null;
  const age = values.dateOfBirth && !errors.dateOfBirth ? ageOn(values.dateOfBirth, today) : null;

  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-6xl px-4 pt-8 sm:pt-10", dirty ? "pb-44 lg:pb-32" : "pb-16")}>
      <div onClickCapture={guardLeave} className="w-fit">
        <BackLink locale={locale} to={href("/account", locale)}>
          {t(locale, "account.back")}
        </BackLink>
      </div>
      <header className="mt-5 max-w-2xl">
        <Heading title={say(locale, "My profile", "ملفي الشخصي")} />
        <p className="mt-4 text-sm leading-relaxed text-muted-ink sm:text-base">
          {say(
            locale,
            "Save your details and documents once. Every new application is filled in from here.",
            "احفظ بياناتك ومستنداتك مرة واحدة، وسنملأ منها كل طلب جديد تلقائياً.",
          )}
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <ProfileChecklist
            locale={locale}
            {...progress}
            onJump={jump}
            alert={
              health === "short" ? (
                <button
                  type="button"
                  onClick={() => focusTarget(fieldId("passportExpiry"))}
                  className="mt-4 flex w-full items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-start text-xs leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200 transition-colors hover:bg-amber-100"
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <span>
                    <span className="block font-semibold">{say(locale, "Passport expires soon", "جوازك ينتهي قريباً")}</span>
                    {say(
                      locale,
                      `It expires on ${formatDay(values.passportExpiry, locale)}. Renew it before your next trip.`,
                      `ينتهي في ${formatDay(values.passportExpiry, locale)}. جدّده قبل سفرك القادم.`,
                    )}
                  </span>
                </button>
              ) : null
            }
          />
          <PrivacyNote locale={locale} className="hidden lg:flex" />
        </aside>

        <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
          <form
            id="profile-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <fieldset disabled={pending} className="min-w-0 space-y-5">
              <Section icon={Phone} title={say(locale, "Contact", "التواصل")} hint={say(locale, "How we reach you about your applications.", "كيف نتواصل معك بخصوص طلباتك.")}>
                <Field id="profile-email" label={t(locale, "profile.email")} hint={<HintRow icon={Lock}>{say(locale, "Your sign-in email. It can't be changed here.", "بريد تسجيل الدخول، ولا يمكن تغييره من هنا.")}</HintRow>}>
                  <input id="profile-email" value={email} disabled readOnly dir="ltr" aria-describedby="profile-email-hint" className={cn(inputClass, ltrInput)} />
                </Field>
                <Field
                  id={fieldId("phone")}
                  label={t(locale, "profile.phone")}
                  error={shownError("phone")}
                  hint={say(locale, "With country code, for urgent updates.", "مع كود الدولة، للتواصل العاجل.")}
                >
                  <input {...control("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+20 100 123 4567" className={cn(inputClass, ltrInput)} />
                </Field>
              </Section>

              <Section
                icon={UserRound}
                title={say(locale, "Identity", "البيانات الشخصية")}
                hint={say(locale, "Write your name exactly as in your passport, in English letters.", "اكتب اسمك كما هو في الجواز بالحروف الإنجليزية.")}
              >
                <Field id={fieldId("firstName")} label={t(locale, "apply.firstName")} required error={shownError("firstName")}>
                  <input {...control("firstName")} autoComplete="given-name" dir="ltr" placeholder="Ahmed" aria-required className={cn(inputClass, ltrInput)} />
                </Field>
                <Field id={fieldId("lastName")} label={t(locale, "apply.lastName")} required error={shownError("lastName")}>
                  <input {...control("lastName")} autoComplete="family-name" dir="ltr" placeholder="Hassan" aria-required className={cn(inputClass, ltrInput)} />
                </Field>
                <Field id={fieldId("sex")} label={t(locale, "apply.sex")} error={shownError("sex")}>
                  <select {...control("sex")} className={inputClass}>
                    <option value="">{t(locale, "common.select")}</option>
                    <option value="female">{t(locale, "apply.female")}</option>
                    <option value="male">{t(locale, "apply.male")}</option>
                    <option value="other">{t(locale, "apply.other")}</option>
                  </select>
                </Field>
                <Field
                  id={fieldId("dateOfBirth")}
                  label={t(locale, "apply.dob")}
                  error={shownError("dateOfBirth")}
                  hint={age !== null ? say(locale, `Age ${age}`, `العمر: ${age} سنة`) : undefined}
                >
                  <input
                    {...control("dateOfBirth")}
                    type="date"
                    autoComplete="bday"
                    dir="ltr"
                    min={shiftYears(today, -120)}
                    max={shiftDays(today, -1)}
                    className={cn(inputClass, ltrInput)}
                  />
                </Field>
              </Section>

              <Section
                icon={IdCard}
                title={say(locale, "Passport", "جواز السفر")}
                hint={say(locale, "Most countries need 6 months of validity after you travel.", "معظم الدول تشترط صلاحية 6 أشهر على الأقل بعد السفر.")}
              >
                <Field
                  id={fieldId("passportNumber")}
                  label={t(locale, "apply.passportNo")}
                  error={shownError("passportNumber")}
                  hint={say(locale, "Letters and digits only.", "حروف وأرقام فقط.")}
                >
                  <input
                    {...control("passportNumber")}
                    onChange={(event) => update("passportNumber", event.target.value.toUpperCase().replace(/\s+/g, ""))}
                    dir="ltr"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="A12345678"
                    className={cn(inputClass, ltrInput, "tracking-wider")}
                  />
                </Field>
                <Field id={fieldId("nationality")} label={t(locale, "apply.nationality")} error={shownError("nationality")}>
                  <select {...control("nationality")} className={inputClass}>
                    <option value="">{t(locale, "common.select")}</option>
                    {nationalities.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id={fieldId("passportExpiry")}
                  label={t(locale, "apply.passportExp")}
                  error={shownError("passportExpiry")}
                  hint={health ? <ExpiryHint locale={locale} health={health} expiry={values.passportExpiry} /> : undefined}
                >
                  <input {...control("passportExpiry")} type="date" dir="ltr" min={shiftDays(today, 1)} max={shiftYears(today, 20)} className={cn(inputClass, ltrInput)} />
                </Field>
              </Section>
            </fieldset>
          </form>

          <ProfileDocuments locale={locale} documents={vault.documents} onNotice={announce} />
          <PrivacyNote locale={locale} className="lg:hidden" />
        </div>
      </div>

      {dirty ? (
        <div className="fixed inset-x-0 bottom-[5.25rem] z-40 px-3 lg:bottom-0 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div
            role="region"
            aria-label={say(locale, "Unsaved changes", "تغييرات غير محفوظة")}
            className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[#16182b] px-4 py-3 text-white shadow-[0_18px_40px_-12px_rgba(22,24,43,0.55)]"
          >
            <div className="min-w-0 flex-1 text-sm" aria-live="polite">
              {failure ? (
                <p className="text-rose-200">{failure}</p>
              ) : invalid.length ? (
                <button type="button" onClick={reveal} className="text-start font-medium text-[#ffd873] underline-offset-4 hover:underline">
                  {attentionText(locale, invalid.length)}
                </button>
              ) : (
                <p className="text-white/85">{say(locale, "You have unsaved changes", "لديك تغييرات غير محفوظة")}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={pending}
                className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                {say(locale, "Discard", "تراجع")}
              </button>
              <button
                type="submit"
                form="profile-form"
                disabled={pending || invalid.length > 0}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ffd873] px-5 text-sm font-semibold text-[#16182b] transition-colors hover:bg-[#ffcd4d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
                {pending ? say(locale, "Saving…", "جارٍ الحفظ…") : say(locale, "Save changes", "حفظ التغييرات")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        aria-live="polite"
        className={cn("pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 transition-[bottom]", dirty ? "bottom-[11.5rem] lg:bottom-24" : "bottom-24 lg:bottom-6")}
      >
        {notice ? (
          <p key={notice.id} className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {notice.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={cn(cardClass, "p-5 sm:p-6")}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <SectionTitle title={title} hint={hint} className="flex-1" />
      </div>
      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-sm font-medium text-[#16182b]">
        {label}
        {required ? (
          <span className="text-rose-500" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs leading-relaxed text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-muted-ink">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function HintRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

function ExpiryHint({ locale, health, expiry }: { locale: string; health: "missing" | "expired" | "short" | "ok"; expiry: string }) {
  const date = formatDay(expiry, locale);
  if (health === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
        {say(locale, `Valid until ${date}`, `ساري حتى ${date}`)}
      </span>
    );
  }
  if (health === "short") {
    return (
      <span className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 font-medium text-amber-800">
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
        {say(locale, `Expires ${date}, within 6 months. Many countries will refuse it, so renew soon.`, `ينتهي في ${date}، أي خلال أقل من 6 أشهر. دول كثيرة ترفضه، فجدّده قريباً.`)}
      </span>
    );
  }
  if (health === "expired") {
    return <span className="font-medium text-rose-600">{say(locale, `Expired on ${date}`, `انتهى في ${date}`)}</span>;
  }
  return null;
}
