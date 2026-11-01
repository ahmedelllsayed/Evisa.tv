"use server";

import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { documentGaps } from "@/lib/application-rules";
import { requireUser } from "@/lib/auth";
import {
  addDocument,
  deleteDocument,
  getApplication,
  listDocuments,
  listTravelers,
  saveTravelers,
  setStep,
  type TravelerInput,
} from "@/lib/data/applications";
import { attachProfileDocuments, getProfileDocumentByPath, getProfileVault, saveProfileDocument } from "@/lib/data/profile-vault";
import { createCheckout } from "@/lib/payments";
import { ALLOWED_TYPES, copyStoredFile, MAX_UPLOAD_BYTES, removeFile, storeFile } from "@/lib/storage";
import type { Application, ApplicationStep } from "@/lib/types";

function canEdit(status: string) {
  return status === "draft" || status === "payment_pending";
}

async function owned(locale: string, id: string) {
  const user = await requireUser(locale, `/${locale}/apply/${id}`);
  const app = await getApplication(id);
  if (!app || (app.userId !== user.id && user.role !== "admin")) redirect(`/${locale}/account`);
  return { user, app };
}

function lockedResult(app: Application, locale: string) {
  if (canEdit(app.status)) return null;
  return { ok: false as const, error: t(locale, "err.locked") };
}

export async function saveTravelersAction(locale: string, applicationId: string, travelers: TravelerInput[]) {
  const { user, app } = await owned(locale, applicationId);
  const locked = lockedResult(app, locale);
  if (locked) return locked;
  if (!travelers.length) return { ok: false as const, error: t(locale, "err.addTraveller") };
  const text = (value: string | null | undefined) => (value ?? "").trim();
  const incomplete = travelers.some(
    (t) => !text(t.firstName) || !text(t.lastName) || !text(t.dateOfBirth) || !text(t.passportNumber) || !text(t.passportExpiry),
  );
  if (incomplete) return { ok: false as const, error: t(locale, "err.incomplete") };
  const saved = await saveTravelers(app.id, travelers);
  if (!saved.ok) return saved;
  if (user.id === app.userId) await attachProfileDocuments(user.id, app.id);
  await setStep(app.id, "documents");
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
  if (locked) return locked;
  if (!(file instanceof File) || !file.size) return { ok: false as const, error: t(locale, "err.chooseFile") };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, error: t(locale, "err.fileSize") };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false as const, error: t(locale, "err.fileType") };
  const storagePath = await storeFile(user.id, app.id, file);
  try {
    await addDocument({
      applicationId: app.id,
      travelerId,
      kind,
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
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
    if (user.role !== "admin") return { ok: false as const, error: t(locale, "err.issued") };
  } else {
    const locked = lockedResult(app, locale);
    if (locked) return locked;
  }
  try {
    await deleteDocument(doc.id, { allowIssuedVisa: user.role === "admin" });
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

export async function startPaymentAction(locale: string, applicationId: string) {
  const { user, app } = await owned(locale, applicationId);
  if (!canEdit(app.status)) return { ok: false as const, error: t(locale, "err.payLocked") };
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
