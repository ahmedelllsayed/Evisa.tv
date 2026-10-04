"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProfileDocumentAction, updateProfileAction, uploadProfileDocumentAction } from "@/app/actions/profile";
import { documentLabels } from "@/data/seed/content";
import { countries } from "@/lib/countries";
import { profileDocumentKinds, type ProfileVault } from "@/lib/profile";
import type { User } from "@/lib/types";

function fileHref(storagePath: string) {
  return `/api/files/${storagePath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

export function ProfileForm({ locale, user, vault }: { locale: string; user: User; vault: ProfileVault }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saved = new Map(vault.documents.map((doc) => [doc.kind, doc]));
  const extra = vault.documents.filter((doc) => !profileDocumentKinds.includes(doc.kind as (typeof profileDocumentKinds)[number]));
  const ready = Boolean(vault.firstName && vault.lastName && vault.dateOfBirth && vault.passportNumber && vault.passportExpiry && saved.has("passport"));

  return (
    <div className="mx-auto max-w-xl px-4 py-10" translate="no">
      <h1 className="font-display text-3xl font-semibold">Profile</h1>
      <p className="mt-2 text-sm leading-6 text-muted-ink">
        Save your passport details and documents once. The next visa application fills them in for you.
      </p>
      <p className={`mt-3 text-sm ${ready ? "text-brand" : "text-muted-ink"}`}>
        {ready ? "Your profile is ready to reuse." : "Add your passport details and a passport scan to reuse them on every application."}
      </p>

      <form
        className="mt-6 space-y-4"
        action={(fd) =>
          start(async () => {
            setError(null);
            setMessage(null);
            const result = await updateProfileAction(locale, fd);
            if (!result.ok) setError(result.error);
            else setMessage("Profile saved.");
          })
        }
      >
        <label className="block text-sm">
          Email
          <input disabled value={user.email} className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            First name
            <input name="firstName" required defaultValue={vault.firstName} className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">
            Last name
            <input name="lastName" required defaultValue={vault.lastName} className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">
            Phone
            <input name="phone" defaultValue={vault.phone} className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">
            Sex
            <select name="sex" defaultValue={vault.sex} className="mt-1 h-11 w-full rounded-xl border border-line px-3">
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other / unspecified</option>
            </select>
          </label>
          <label className="block text-sm">
            Date of birth
            <input name="dateOfBirth" type="date" required defaultValue={vault.dateOfBirth} className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">
            Nationality
            <select name="nationality" defaultValue={vault.nationality} className="mt-1 h-11 w-full rounded-xl border border-line px-3">
              <option value="">Select</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Passport number
            <input name="passportNumber" required defaultValue={vault.passportNumber} className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
          </label>
          <label className="block text-sm">
            Passport expiry
            <input name="passportExpiry" type="date" required defaultValue={vault.passportExpiry} className="mt-1 h-11 w-full rounded-xl border border-line px-3" />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-muted-ink">{message}</p>}
        <button disabled={pending} className="h-11 rounded-full bg-brand px-5 text-sm font-medium text-white disabled:opacity-60">
          Save profile
        </button>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Documents</h2>
        <p className="mt-1 text-sm text-muted-ink">Upload each file once. Applications reuse the copy that matches this passport.</p>
        <ul className="mt-4 space-y-3">
          {[...profileDocumentKinds, ...extra.map((doc) => doc.kind)].map((kind) => {
            const doc = saved.get(kind);
            return (
              <li key={kind} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
                <span>
                  <span className="block text-sm font-medium">{documentLabels[kind]?.label ?? kind}</span>
                  <span className="text-xs text-muted-ink">{doc ? doc.fileName : (documentLabels[kind]?.hint ?? "Upload a JPG, PNG, WebP or PDF")}</span>
                </span>
                <span className="flex items-center gap-3">
                  {doc && (
                    <a href={fileHref(doc.storagePath)} target="_blank" rel="noreferrer" className="text-xs text-brand">
                      View
                    </a>
                  )}
                  <label className="cursor-pointer rounded-full bg-surface px-3 py-1 text-xs font-medium">
                    {doc ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        const fd = new FormData();
                        fd.set("locale", locale);
                        fd.set("kind", kind);
                        fd.set("file", file);
                        start(async () => {
                          setError(null);
                          setMessage(null);
                          const result = await uploadProfileDocumentAction(fd);
                          if (!result.ok) setError(result.error);
                          else {
                            setMessage(`${documentLabels[kind]?.label ?? kind} saved to your profile.`);
                            router.refresh();
                          }
                        });
                      }}
                    />
                  </label>
                  {doc && (
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          setMessage(null);
                          await deleteProfileDocumentAction(locale, kind);
                          router.refresh();
                        })
                      }
                    >
                      Remove
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
