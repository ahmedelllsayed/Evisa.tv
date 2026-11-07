"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deleteProfileDocument, saveProfileDocument, saveProfileIdentity } from "@/lib/data/profile-vault";
import { isArabicLocale, t } from "@/lib/i18n";
import { storeFile } from "@/lib/storage";
import { acceptedUpload } from "@/lib/uploads";
import { marketToday, normalizeProfile, profileErrors, readProfileForm, type ProfileErrors, type ProfileValues } from "@/components/account/profile/rules";

export type ProfileSaveResult = { ok: true; values: ProfileValues } | { ok: false; error: string; fields?: ProfileErrors };
export type ProfileFileResult = { ok: true } | { ok: false; error: string };

function pick(locale: string, en: string, ar: string) {
  return isArabicLocale(locale) ? ar : en;
}

function refresh(locale: string) {
  revalidatePath(`/${locale}/account/profile`);
  revalidatePath(`/${locale}/account`);
}

export async function updateProfileAction(locale: string, formData: FormData): Promise<ProfileSaveResult> {
  const user = await requireUser(locale, `/${locale}/account/profile`);
  const raw = readProfileForm(formData);
  const fields = profileErrors(raw, marketToday(), locale);
  if (Object.keys(fields).length) {
    return { ok: false, error: pick(locale, "Check the highlighted fields.", "راجع الحقول المحددة."), fields };
  }
  const values = normalizeProfile(raw);
  try {
    await saveProfileIdentity(user.id, values);
  } catch {
    return { ok: false, error: pick(locale, "We couldn't save your profile. Try again.", "تعذّر حفظ الملف. حاول مرة أخرى.") };
  }
  refresh(locale);
  return { ok: true, values };
}

export async function uploadProfileDocumentAction(formData: FormData): Promise<ProfileFileResult> {
  const locale = String(formData.get("locale") ?? "");
  const kind = String(formData.get("kind") ?? "").trim();
  const file = formData.get("file");
  const user = await requireUser(locale, `/${locale}/account/profile`);
  if (!kind || kind.length > 200 || kind === "issued_visa") {
    return { ok: false, error: pick(locale, "This document type can't be saved to your profile.", "لا يمكن حفظ هذا النوع من المستندات في ملفك.") };
  }
  if (!(file instanceof File) || !file.size) return { ok: false, error: pick(locale, "Choose a file to upload.", "اختر ملفاً لرفعه.") };
  const checked = await acceptedUpload(file);
  if (!checked.ok) return { ok: false, error: t(locale, checked.error) };
  try {
    const storagePath = await storeFile(user.id, "profile", checked.file);
    await saveProfileDocument(user.id, {
      kind,
      storagePath,
      fileName: checked.file.name,
      mimeType: checked.file.type,
      sizeBytes: checked.file.size,
    });
  } catch {
    return { ok: false, error: pick(locale, "Upload failed. Try again.", "تعذّر الرفع. حاول مرة أخرى.") };
  }
  refresh(locale);
  return { ok: true };
}

export async function deleteProfileDocumentAction(locale: string, kind: string): Promise<ProfileFileResult> {
  const user = await requireUser(locale, `/${locale}/account/profile`);
  try {
    await deleteProfileDocument(user.id, kind);
  } catch {
    return { ok: false, error: pick(locale, "We couldn't remove the file. Try again.", "تعذّر حذف الملف. حاول مرة أخرى.") };
  }
  refresh(locale);
  return { ok: true };
}
