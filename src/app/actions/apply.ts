"use server";

import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { isFullAdmin } from "@/lib/rbac-constants";
import { documentGaps } from "@/lib/application-rules";
import { requireUser } from "@/lib/auth";
import {
  addDocument,
  deleteDocument,
  getApplication,
  listDocuments,
  listTravelers,
  replaceRejectedDocument,
  saveTravelers,
  setStep,
  type TravelerInput,
} from "@/lib/data/applications";
import { attachProfileDocuments, getProfileDocumentByPath, getProfileVault, saveProfileDocument } from "@/lib/data/profile-vault";
import { createCheckout } from "@/lib/payments";
import { sql } from "@/lib/data/db";
import { acceptedUpload } from "@/lib/uploads";
import { copyStoredFile, removeFile, storeFile } from "@/lib/storage";
import type { Application, ApplicationStep } from "@/lib/types";

function canEdit(status: string) {
  return status === "draft" || status === "payment_pending";
}

async function owned(locale: string, id: string) {
  const user = await requireUser(locale, `/${locale}/apply/${id}`);
  const app = await getApplication(id);
  if (!app || app.userId !== user.id) redirect(`/${locale}/account`);
  return { user, app };
}

function lockedResult(app: Application, locale: string) {
  if (canEdit(app.status)) return null;
  return { ok: false as const, error: t(locale, "err.locked") };
}

export async function saveTravelersAction(locale: string, applicationId: string, travelers: TravelerInput[], advance = true) {
  const { user, app } = await owned(locale, applicationId);
  const locked = lockedResult(app, locale);
  if (locked) return locked;
  if (!travelers.length) return { ok: false as const, error: t(locale, "err.addTraveller") };
  const text = (value: string | null | undefined) => (value ?? "").trim();
  const incomplete = travelers.some(
    (t) => !text(t.firstName) || !text(t.lastName) || !text(t.dateOfBirth) || !text(t.passportNumber) || !text(t.passportExpiry),
  );
  if (incomplete) return { ok: false as const, error: t(locale, "err.incomplete") };
  if (app.departureDate) {
    const depart = new Date(`${app.departureDate}T00:00:00Z`).getTime();
    const short = travelers.some((traveler) => {
      const expiry = new Date(`${traveler.passportExpiry}T00:00:00Z`).getTime();
      return Number.isNaN(expiry) || expiry < depart + 180 * 864e5;
    });
    if (short) return { ok: false as const, error: t(locale, "err.passportShort") };
  }
  const saved = await saveTravelers(app.id, travelers);
  if (!saved.ok) return saved;
  if (user.id === app.userId) await attachProfileDocuments(user.id, app.id);
  if (advance) await setStep(app.id, "documents");
  return { ok: true as const };
}

export async function uploadDocumentAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const travelerId = String(formData.get("travelerId") || "") || null;
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  const { user, app } = await owned(locale, applicationId);
  if (kind === "issued_visa") return { ok: false as const, error: t(locale, "err.issued") };
  const locked = lockedResult(app, locale);
  const rejected = locked
    ? (await listDocuments(app.id)).find(
        (doc) => doc.status === "rejected" && doc.kind === kind && (doc.travelerId ?? null) === (travelerId ?? null),
      )
    : undefined;
  if (locked && !rejected) return locked;
  if (!(file instanceof File) || !file.size) return { ok: false as const, error: t(locale, "err.chooseFile") };
  const checked = await acceptedUpload(file);
  if (!checked.ok) return { ok: false as const, error: t(locale, checked.error) };
  const storagePath = await storeFile(user.id, app.id, checked.file);
  try {
    if (rejected) {
      await replaceRejectedDocument({
        documentId: rejected.id,
        applicationId: app.id,
        travelerId,
        kind,
        storagePath,
        fileName: checked.file.name,
        mimeType: checked.file.type,
        sizeBytes: checked.file.size,
      });
    } else {
      await addDocument({
        applicationId: app.id,
        travelerId,
        kind,
        storagePath,
        fileName: checked.file.name,
        mimeType: checked.file.type,
        sizeBytes: checked.file.size,
      });
    }
  } catch (error) {
    await removeFile(storagePath).catch(() => undefined);
    return { ok: false as const, error: error instanceof Error ? error.message : t(locale, "err.saveDoc") };
  }
  if (user.id === app.userId && travelerId) {
    const [vault, travelers] = await Promise.all([getProfileVault(user.id), listTravelers(app.id)]);
    const primary = travelers[0];
    const savedPassport = vault?.passportNumber.trim().toLowerCase();
    const samePassport = Boolean(savedPassport) && savedPassport === (primary?.passportNumber ?? "").trim().toLowerCase();
    if (primary && primary.id === travelerId && samePassport) {
      const profilePath = await copyStoredFile(user.id, "profile", storagePath, file.name, file.type);
      await saveProfileDocument(user.id, {
        kind,
        storagePath: profilePath,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }
  }
  return { ok: true as const };
}

export async function deleteDocumentAction(locale: string, applicationId: string, documentId: string) {
  const { user, app } = await owned(locale, applicationId);
  const docs = await listDocuments(applicationId);
  const doc = docs.find((d) => d.id === documentId);
  if (!doc) return { ok: true as const };
  if (doc.kind === "issued_visa") {
    if (!isFullAdmin(user.role)) return { ok: false as const, error: t(locale, "err.issued") };
  } else {
    const locked = lockedResult(app, locale);
    if (locked) return locked;
  }
  try {
    await deleteDocument(doc.id, { allowIssuedVisa: isFullAdmin(user.role) });
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : t(locale, "err.locked") };
  }
  const shared = await getProfileDocumentByPath(doc.storagePath);
  if (!shared) await removeFile(doc.storagePath);
  return { ok: true as const };
}

export async function goToStepAction(locale: string, applicationId: string, step: ApplicationStep) {
  const { app } = await owned(locale, applicationId);
  const locked = lockedResult(app, locale);
  if (locked) return locked;
  if (step === "done") return { ok: false as const, error: t(locale, "err.step") };
  const moved = await setStep(applicationId, step);
  if (!moved) return { ok: false as const, error: t(locale, "err.locked") };
  return { ok: true as const };
}

export async function startPaymentAction(locale: string, applicationId: string, phone?: string, acceptedTerms = false) {
  const { user, app } = await owned(locale, applicationId);
  if (!canEdit(app.status)) return { ok: false as const, error: t(locale, "err.payLocked") };
  if (!acceptedTerms) return { ok: false as const, error: t(locale, "apply.terms") };
  await sql(
    "insert into application_events (application_id, status, title, description, internal) values ($1,$2,'terms.accepted',$3,true)",
    [app.id, app.status, new Date().toISOString()],
  );
  const nextPhone = (phone ?? user.phone ?? "").trim();
  if (!nextPhone) return { ok: false as const, error: t(locale, "err.payPhone") };
  if (nextPhone !== (user.phone ?? "")) {
    await sql("update profiles set phone = $2 where id = $1", [user.id, nextPhone]);
  }
  user.phone = nextPhone;
  const travelers = await listTravelers(app.id);
  const documents = await listDocuments(app.id);
  const required = app.documentsRequired.length ? app.documentsRequired : ["passport"];
  if (!travelers.length || documentGaps(required, travelers, documents).length) {
    return { ok: false as const, error: t(locale, "err.docsBeforePay") };
  }
  await setStep(app.id, "payment");
  const checkout = await createCheckout(app, locale, user);
  if (!checkout.ok) return checkout;
  redirect(checkout.url);
}
