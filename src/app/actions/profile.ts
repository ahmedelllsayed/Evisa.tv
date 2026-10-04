"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deleteProfileDocument, saveProfileDocument, saveProfileIdentity } from "@/lib/data/profile-vault";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, storeFile } from "@/lib/storage";

export async function updateProfileAction(locale: string, formData: FormData) {
  const user = await requireUser(locale);
  const nationality = String(formData.get("nationality") ?? "").trim().toUpperCase();
  if (nationality && !/^[A-Z]{2}$/.test(nationality)) return { ok: false as const, error: "Choose a nationality." };
  await saveProfileIdentity(user.id, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    sex: String(formData.get("sex") ?? ""),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    nationality,
    passportNumber: String(formData.get("passportNumber") ?? ""),
    passportExpiry: String(formData.get("passportExpiry") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  revalidatePath(`/${locale}/account/profile`);
  return { ok: true as const };
}

export async function uploadProfileDocumentAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  const user = await requireUser(locale, `/${locale}/account/profile`);
  if (!kind || kind === "issued_visa") return { ok: false as const, error: "Choose a document type." };
  if (!(file instanceof File) || !file.size) return { ok: false as const, error: "Choose a file." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, error: "File must be under 10MB." };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false as const, error: "Use a JPG, PNG, WebP or PDF." };
  const storagePath = await storeFile(user.id, "profile", file);
  await saveProfileDocument(user.id, {
    kind,
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  revalidatePath(`/${locale}/account/profile`);
  return { ok: true as const };
}

export async function deleteProfileDocumentAction(locale: string, kind: string) {
  const user = await requireUser(locale, `/${locale}/account/profile`);
  await deleteProfileDocument(user.id, kind);
  revalidatePath(`/${locale}/account/profile`);
}
