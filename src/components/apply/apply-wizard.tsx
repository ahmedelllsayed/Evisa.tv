"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteDocumentAction,
  goToStepAction,
  saveTravelersAction,
  startPaymentAction,
  uploadDocumentAction,
} from "@/app/actions/apply";
import { documentLabels } from "@/data/seed/content";
import { documentGaps } from "@/lib/application-rules";
import { countries } from "@/lib/countries";
import type { ProfileVault } from "@/lib/profile";
import type { Application, ApplicationDocument, ApplicationStep, Traveler } from "@/lib/types";
import { formatMoney, formatOrdinalShort } from "@/lib/visa";
import { cn } from "@/lib/utils";

const steps: { id: ApplicationStep; label: string }[] = [
  { id: "travelers", label: "Travellers" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
  { id: "payment", label: "Payment" },
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
}: {
  locale: string;
  application: Application;
  travelers: Traveler[];
  documents: ApplicationDocument[];
  profile: ProfileVault | null;
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-muted-ink">
        {application.destinationName} · {application.reference}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Complete your application</h1>
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
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      {step === "travelers" && (
        <section className="mt-8 space-y-6">
          {drafts.map((t, i) => (
            <TravelerForm
              key={t.id ?? i}
              index={i}
              value={t}
              fromProfile={i === 0 && Boolean(profilePassport) && t.passportNumber.trim().toLowerCase() === profilePassport}
              onChange={(next) => setDrafts((all) => all.map((x, j) => (j === i ? next : x)))}
              onRemove={drafts.length > 1 ? () => setDrafts((all) => all.filter((_, j) => j !== i)) : undefined}
            />
          ))}
          <button
            type="button"
            className="text-sm font-medium text-brand"
            onClick={() => setDrafts((all) => [...all, toDraft()])}
          >
            + Add traveller
          </button>
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
            Continue to documents
          </button>
        </section>
      )}

      {step === "documents" && (
        <section className="mt-8 space-y-6">
          {profile && savedKinds.size > 0 && (
            <p className="text-sm text-muted-ink">Files already on your profile are attached when the passport number matches.</p>
          )}
          {(travelers.length ? travelers : drafts).map((t, i) => (
            <div key={t.id ?? i} className="rounded-2xl border border-line p-4">
              <p className="font-medium">
                {t.firstName} {t.lastName}
              </p>
              <ul className="mt-3 space-y-3">
                {required.map((kind) => {
                  const doc = documents.find((d) => d.kind === kind && d.travelerId === (t.id ?? null));
                  const rejected = doc?.status === "rejected";
                  return (
                    <li key={kind} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
                      <span>
                        <span className="block text-sm font-medium">{documentLabels[kind]?.label ?? kind}</span>
                        <span className="text-xs text-muted-ink">
                          {doc && !rejected
                            ? `${doc.fileName}${savedKinds.has(kind) ? " · Saved on your profile" : ""}`
                            : documentLabels[kind]?.hint ?? "Upload a file"}
                        </span>
                        {rejected && (
                          <span className="mt-1 block text-xs text-red-600">
                            Rejected{doc.rejectReason ? `: ${doc.rejectReason}` : ""}. Upload a new file.
                          </span>
                        )}
                      </span>
                      {doc && !rejected ? (
                        <button
                          type="button"
                          className="text-xs text-red-600"
                          onClick={() =>
                            start(async () => {
                              await deleteDocumentAction(locale, application.id, doc.id);
                              router.refresh();
                            })
                          }
                        >
                          Remove
                        </button>
                      ) : (
                        <label className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs font-medium">
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file || !t.id) return;
                              const fd = new FormData();
                              fd.set("locale", locale);
                              fd.set("applicationId", application.id);
                              fd.set("travelerId", t.id);
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
            <p className="text-sm text-red-600">Upload every required document before you continue. Rejected files need a new upload.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={gaps.length > 0 || pending}
            className="h-12 w-full rounded-full bg-brand font-medium text-white disabled:opacity-60"
            onClick={() =>
              start(async () => {
                if (gaps.length > 0) return;
                await goToStepAction(locale, application.id, "review");
                setStep("review");
              })
            }
          >
            Continue to review
          </button>
        </section>
      )}

      {step === "review" && (
        <section className="mt-8 space-y-4">
          <div className="rounded-2xl border border-line p-5">
            <p className="text-sm text-muted-ink">Guaranteed by</p>
            <p className="font-display text-xl font-semibold">
              {application.guaranteedAt ? formatOrdinalShort(application.guaranteedAt) : "—"}
            </p>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Government fees</dt>
                <dd>{formatMoney(application.govFee, application.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Processing fees</dt>
                <dd>{formatMoney(application.serviceFee, application.currency)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(application.totalAmount, application.currency)}</dd>
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
                const result = await startPaymentAction(locale, application.id);
                if (result && !result.ok) setError(result.error);
              })
            }
          >
            Pay {formatMoney(application.totalAmount, application.currency)}
          </button>
        </section>
      )}

      {step === "payment" && (
        <section className="mt-8 text-center">
          <p className="text-body">Finish payment to submit your application.</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={pending}
            className="mt-4 h-12 rounded-full bg-brand px-6 font-medium text-white"
            onClick={() =>
              start(async () => {
                const result = await startPaymentAction(locale, application.id);
                if (result && !result.ok) setError(result.error);
              })
            }
          >
            Continue to payment
          </button>
        </section>
      )}
    </div>
  );
}

function TravelerForm({
  index,
  value,
  fromProfile,
  onChange,
  onRemove,
}: {
  index: number;
  value: Draft;
  fromProfile?: boolean;
  onChange: (v: Draft) => void;
  onRemove?: () => void;
}) {
  const set = (k: keyof Draft, v: string) => onChange({ ...value, [k]: v });
  const fields: [keyof Draft, string, string][] = [
    ["firstName", "First name", "text"],
    ["lastName", "Last name", "text"],
    ["dateOfBirth", "Date of birth", "date"],
    ["passportNumber", "Passport number", "text"],
    ["passportExpiry", "Passport expiry", "date"],
  ];
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">Traveller {index + 1}{fromProfile ? " · from your profile" : ""}</p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-red-600">
            Remove
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <label key={key} className="text-sm">
            {label}
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
          Sex
          <select value={value.sex} onChange={(e) => set("sex", e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-3">
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other / unspecified</option>
          </select>
        </label>
        <label className="text-sm">
          Nationality
          <select
            value={value.nationality}
            onChange={(e) => set("nationality", e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-line px-3"
            translate="no"
          >
            <option value="">Select</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
