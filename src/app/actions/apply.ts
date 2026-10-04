"use server";

import { redirect } from "next/navigation";
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
import type { ApplicationStep } from "@/lib/types";

async function owned(locale: string, id: string) {
  const user = await requireUser(locale, `/${locale}/apply/${id}`);
  const app = await getApplication(id);
  if (!app || (app.userId !== user.id && user.role !== "admin")) redirect(`/${locale}/account`);
  return { user, app };
}

export async function saveTravelersAction(locale: string, applicationId: string, travelers: TravelerInput[]) {
  const { user, app } = await owned(locale, applicationId);
  if (!travelers.length) return { ok: false as const, error: "Add at least one traveller" };
  const text = (value: string | null | undefined) => (value ?? "").trim();
  const incomplete = travelers.some(
    (t) => !text(t.firstName) || !text(t.lastName) || !text(t.dateOfBirth) || !text(t.passportNumber) || !text(t.passportExpiry),
  );
  if (incomplete) return { ok: false as const, error: "Enter each traveller’s name, date of birth, and passport details." };
  await saveTravelers(app.id, travelers);
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
  if (!(file instanceof File) || !file.size) return { ok: false as const, error: "Choose a file" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, error: "File must be under 10MB" };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false as const, error: "Use a JPG, PNG, WebP or PDF" };
  const storagePath = await storeFile(user.id, app.id, file);
  await addDocument({
    applicationId: app.id,
    travelerId,
    kind,
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (user.id === app.userId && travelerId && kind !== "issued_visa") {
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
  await owned(locale, applicationId);
  const docs = await listDocuments(applicationId);
  const doc = docs.find((d) => d.id === documentId);
  if (doc) {
    await deleteDocument(doc.id);
    const shared = await getProfileDocumentByPath(doc.storagePath);
    if (!shared) await removeFile(doc.storagePath);
  }
  return { ok: true as const };
}

export async function goToStepAction(locale: string, applicationId: string, step: ApplicationStep) {
  await owned(locale, applicationId);
  await setStep(applicationId, step);
}

export async function startPaymentAction(locale: string, applicationId: string) {
  const { user, app } = await owned(locale, applicationId);
  const travelers = await listTravelers(app.id);
  const documents = await listDocuments(app.id);
  const required = app.documentsRequired.length ? app.documentsRequired : ["passport"];
  if (!travelers.length || documentGaps(required, travelers, documents).length) {
    return { ok: false as const, error: "Upload the required documents before paying." };
  }
  await setStep(app.id, "payment");
  const checkout = await createCheckout(app, locale, user);
  if (!checkout.ok) return checkout;
  redirect(checkout.url);
}
