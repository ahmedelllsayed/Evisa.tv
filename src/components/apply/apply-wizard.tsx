"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteDocumentAction,
  goToStepAction,
  saveTravelersAction,
  startPaymentAction,
  uploadDocumentAction,
} from "@/app/actions/apply";
import { track } from "@/lib/analytics";
import { documentGaps } from "@/lib/application-rules";
import { countries, countryName } from "@/lib/countries";
import { href } from "@/lib/href";
import { t, tf } from "@/lib/i18n";
import { docHint, docLabel } from "@/lib/localize";
import type { ProfileVault } from "@/lib/profile";
import type { Application, ApplicationDocument, ApplicationStep, Traveler } from "@/lib/types";
import { formatMoney, formatOrdinalShort } from "@/lib/visa";
import { cn } from "@/lib/utils";

const steps: { id: ApplicationStep; label: "apply.travelers" | "apply.documents" | "apply.review" | "apply.payment" }[] = [
  { id: "travelers", label: "apply.travelers" },
  { id: "documents", label: "apply.documents" },
  { id: "review", label: "apply.review" },
  { id: "payment", label: "apply.payment" },
];

type Draft = {
  id?: string;
  firstName: string;
  lastName: string;
  sex: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
};

function toDraft(t?: Traveler): Draft {
  return {
    id: t?.id,
    firstName: t?.firstName ?? "",
    lastName: t?.lastName ?? "",
    sex: t?.sex ?? "",
    dateOfBirth: t?.dateOfBirth ?? "",
    nationality: t?.nationality ?? "",
    passportNumber: t?.passportNumber ?? "",
    passportExpiry: t?.passportExpiry ?? "",
  };
}

function draftFromProfile(profile: ProfileVault | null): Draft {
  if (!profile) return toDraft();
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    sex: profile.sex,
    dateOfBirth: profile.dateOfBirth,
    nationality: profile.nationality,
    passportNumber: profile.passportNumber,
    passportExpiry: profile.passportExpiry,
  };
}

export function ApplyWizard({
  locale,
  application,
  travelers,
  documents,
  profile,
  countLocked = false,
}: {
  locale: string;
  application: Application;
  travelers: Traveler[];
  documents: ApplicationDocument[];
  profile: ProfileVault | null;
  countLocked?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<ApplicationStep>(application.step === "done" ? "review" : application.step);
  const [drafts, setDrafts] = useState<Draft[]>(travelers.length ? travelers.map(toDraft) : [draftFromProfile(profile)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const required = application.documentsRequired.length ? application.documentsRequired : ["passport"];
  const people = travelers.length ? travelers : [];
  const gaps = documentGaps(required, people, documents);
  const savedKinds = new Set(profile?.documents.map((doc) => doc.kind) ?? []);
  const profilePassport = profile?.passportNumber.trim().toLowerCase() ?? "";
  const editable = application.status === "draft" || application.status === "payment_pending";

  if (!editable) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-muted-ink">
          {application.destinationName} · {application.reference}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">{t(locale, "apply.lockedTitle")}</h1>
        <p className="mt-3 text-body">{t(locale, "apply.lockedBody")}</p>
        <Link
          href={href(`/account/applications/${application.id}`, locale)}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 font-medium text-white"
        >
          {t(locale, "account.track")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-muted-ink">
        {application.destinationName} · {application.reference}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">{t(locale, "apply.title")}</h1>
      <ol className="mt-6 flex gap-2 overflow-x-auto scrollbar-none">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                step === s.id ? "bg-black text-white" : "bg-surface text-muted-ink",
              )}
            >
              {i + 1}. {t(locale, s.label)}
            </button>
          </li>
        ))}
      </ol>

      {step === "travelers" && (
        <section className="mt-8 space-y-6">
          {drafts.map((t, i) => (
            <TravelerForm
              locale={locale}
              key={t.id ?? i}
              index={i}
              value={t}
              fromProfile={i === 0 && Boolean(profilePassport) && t.passportNumber.trim().toLowerCase() === profilePassport}
              onChange={(next) => setDrafts((all) => all.map((x, j) => (j === i ? next : x)))}
              onRemove={countLocked || drafts.length <= 1 ? undefined : () => setDrafts((all) => all.filter((_, j) => j !== i))}
            />
          ))}
          {!countLocked && (
            <button
              type="button"
              className="text-sm font-medium text-brand"
              onClick={() => setDrafts((all) => [...all, toDraft()])}
            >
              {t(locale, "apply.addTraveller")}
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={pending}
            className="h-12 w-full rounded-full bg-brand font-medium text-white disabled:opacity-60"
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await saveTravelersAction(locale, application.id, drafts);
                if (!res.ok) setError(res.error);
                else {
                  setStep("documents");
                  router.refresh();
                }
              })
            }
          >
            {t(locale, "apply.continueDocuments")}
          </button>
        </section>
      )}

      {step === "documents" && (
        <section className="mt-8 space-y-6">
          {profile && savedKinds.size > 0 && (
            <p className="text-sm text-muted-ink">{t(locale, "apply.profileFiles")}</p>
          )}
          {(travelers.length ? travelers : drafts).map((traveller, i) => (
            <div key={traveller.id ?? i} className="rounded-2xl border border-line p-4">
              <p className="font-medium">
                {traveller.firstName} {traveller.lastName}
              </p>
              <ul className="mt-3 space-y-3">
                {required.map((kind) => {
                  const doc = documents.find((d) => d.kind === kind && d.travelerId === (traveller.id ?? null));
                  const rejected = doc?.status === "rejected";
                  return (
                    <li key={kind} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
                      <span>
                        <span className="block text-sm font-medium">{docLabel(kind, locale)}</span>
                        <span className="text-xs text-muted-ink">
                          {doc && !rejected
                            ? `${doc.fileName}${savedKinds.has(kind) ? ` · ${t(locale, "apply.savedProfile")}` : ""}`
                            : docHint(kind, locale) || t(locale, "apply.uploadFile")}
                        </span>
                        {rejected && (
                          <span className="mt-1 block text-xs text-red-600">
                            {t(locale, "apply.rejected")}{doc.rejectReason ? `: ${doc.rejectReason}` : ""}. {t(locale, "apply.rejectedNew")}
                          </span>
                        )}
                      </span>
                      {doc && !rejected ? (
                        <button
                          type="button"
                          className="text-xs text-red-600"
                          onClick={() =>
                            start(async () => {
                              const removed = await deleteDocumentAction(locale, application.id, doc.id);
                              if (!removed.ok) setError(removed.error);
                              router.refresh();
                            })
                          }
                        >
                          {t(locale, "common.remove")}
                        </button>
                      ) : (
                        <label className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs font-medium">
                          {t(locale, "common.upload")}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file || !traveller.id) return;
                              const fd = new FormData();
                              fd.set("locale", locale);
                              fd.set("applicationId", application.id);
                              fd.set("travelerId", traveller.id);
                              fd.set("kind", kind);
                              fd.set("file", file);
                              start(async () => {
                                const res = await uploadDocumentAction(fd);
                                if (!res.ok) setError(res.error);
                                router.refresh();
                              });
                            }}
                          />
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {gaps.length > 0 && (
            <p className="text-sm text-red-600">{t(locale, "apply.missingDocs")}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={gaps.length > 0 || pending}
            className="h-12 w-full rounded-full bg-brand font-medium text-white disabled:opacity-60"
            onClick={() =>
              start(async () => {
                if (gaps.length > 0) return;
                const moved = await goToStepAction(locale, application.id, "review");
                if (!moved.ok) {
                  setError(moved.error);
                  return;
                }
                setStep("review");
              })
            }
          >
            {t(locale, "apply.continueReview")}
          </button>
        </section>
      )}

      {step === "review" && (
        <section className="mt-8 space-y-4">
          <div className="rounded-2xl border border-line p-5">
            <p className="text-sm text-muted-ink">{t(locale, "apply.targetBy")}</p>
            <p className="font-display text-xl font-semibold">
              {application.guaranteedAt ? formatOrdinalShort(application.guaranteedAt, locale) : "—"}
            </p>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>{t(locale, "apply.govFee")}</dt>
                <dd>{formatMoney(application.govFee, application.currency, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t(locale, "apply.serviceFee")}</dt>
                <dd>{formatMoney(application.serviceFee, application.currency, locale)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>{t(locale, "apply.total")}</dt>
                <dd>{formatMoney(application.totalAmount, application.currency, locale)}</dd>
              </div>
            </dl>
          </div>
          <ul className="text-sm text-body">
            {travelers.map((t) => (
              <li key={t.id}>
                {t.firstName} {t.lastName}
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={pending}
            className="h-12 w-full rounded-full bg-[#ffd873] font-semibold text-black disabled:opacity-60"
            onClick={() =>
              start(async () => {
                track("add_payment_info", { item_id: application.destinationSlug, value: application.totalAmount });
                const result = await startPaymentAction(locale, application.id);
                if (result && !result.ok) setError(result.error);
              })
            }
          >
            {t(locale, "apply.pay")} {formatMoney(application.totalAmount, application.currency, locale)}
          </button>
        </section>
      )}

      {step === "payment" && (
        <section className="mt-8 text-center">
          <p className="text-body">{t(locale, "apply.finish")}</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={pending}
            className="mt-4 h-12 rounded-full bg-brand px-6 font-medium text-white"
            onClick={() =>
              start(async () => {
                track("add_payment_info", { item_id: application.destinationSlug, value: application.totalAmount });
                const result = await startPaymentAction(locale, application.id);
                if (result && !result.ok) setError(result.error);
              })
            }
          >
            {t(locale, "apply.continuePayment")}
          </button>
        </section>
      )}
    </div>
  );
}

function TravelerForm({
  locale,
  index,
  value,
  fromProfile,
  onChange,
  onRemove,
}: {
  locale: string;
  index: number;
  value: Draft;
  fromProfile?: boolean;
  onChange: (v: Draft) => void;
  onRemove?: () => void;
}) {
  const set = (k: keyof Draft, v: string) => onChange({ ...value, [k]: v });
  const fields: [keyof Draft, "apply.firstName" | "apply.lastName" | "apply.dob" | "apply.passportNo" | "apply.passportExp", string][] = [
    ["firstName", "apply.firstName", "text"],
    ["lastName", "apply.lastName", "text"],
    ["dateOfBirth", "apply.dob", "date"],
    ["passportNumber", "apply.passportNo", "text"],
    ["passportExpiry", "apply.passportExp", "date"],
  ];
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {tf(locale, "apply.travellerN", { n: index + 1 })}
          {fromProfile ? ` · ${t(locale, "apply.fromProfile")}` : ""}
        </p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-red-600">
            {t(locale, "common.remove")}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <label key={key} className="text-sm">
            {t(locale, label)}
            <input
              required
              type={type}
              value={value[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-line px-3"
            />
          </label>
        ))}
        <label className="text-sm">
          {t(locale, "apply.sex")}
          <select value={value.sex} onChange={(e) => set("sex", e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-3">
            <option value="">{t(locale, "common.select")}</option>
            <option value="female">{t(locale, "apply.female")}</option>
            <option value="male">{t(locale, "apply.male")}</option>
            <option value="other">{t(locale, "apply.other")}</option>
          </select>
        </label>
        <label className="text-sm">
          {t(locale, "apply.nationality")}
          <select
            value={value.nationality}
            onChange={(e) => set("nationality", e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-line px-3"
          >
            <option value="">{t(locale, "common.select")}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {countryName(c.code, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
