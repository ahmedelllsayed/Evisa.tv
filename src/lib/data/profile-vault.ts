import "server-only";
import { day, numOrNull, one, sql } from "@/lib/data/db";
import { addDocument, listDocuments, listTravelers } from "@/lib/data/applications";
import type { ProfileDocument, ProfileVault } from "@/lib/profile";
import { copyStoredFile, removeFile } from "@/lib/storage";

export type { ProfileDocument, ProfileVault };

type Row = Record<string, unknown>;

function splitName(fullName: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export async function getProfileVault(userId: string): Promise<ProfileVault | null> {
  const row = await one<Row>("select * from profiles where id = $1", [userId]);
  if (!row) return null;
  const fallback = splitName((row.full_name as string) ?? null);
  const documents = await sql<Row>("select * from profile_documents where user_id = $1 order by created_at", [userId]);
  return {
    firstName: String(row.first_name ?? fallback.firstName),
    lastName: String(row.last_name ?? fallback.lastName),
    sex: String(row.sex ?? ""),
    dateOfBirth: day(row.date_of_birth) ?? "",
    nationality: String(row.nationality ?? "").trim(),
    passportNumber: String(row.passport_number ?? ""),
    passportExpiry: day(row.passport_expiry) ?? "",
    phone: String(row.phone ?? ""),
    documents: documents.map((doc) => ({
      id: String(doc.id),
      kind: String(doc.kind),
      fileName: String(doc.file_name),
      mimeType: (doc.mime_type as string) ?? null,
      sizeBytes: numOrNull(doc.size_bytes),
      storagePath: String(doc.storage_path),
    })),
  };
}

export async function saveProfileIdentity(
  userId: string,
  input: Omit<ProfileVault, "documents" | "phone"> & { phone: string },
) {
  const dateOfBirth = input.dateOfBirth.trim() || null;
  const passportExpiry = input.passportExpiry.trim() || null;
  const nationality = input.nationality.trim().toUpperCase() || null;
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim() || null;
  await sql(
    `update profiles set full_name = $2, phone = $3, first_name = $4, last_name = $5, sex = $6,
       date_of_birth = $7::date, nationality = $8, passport_number = $9, passport_expiry = $10::date
     where id = $1`,
    [
      userId,
      fullName,
      input.phone.trim() || null,
      input.firstName.trim() || null,
      input.lastName.trim() || null,
      input.sex.trim() || null,
      dateOfBirth,
      nationality,
      input.passportNumber.trim() || null,
      passportExpiry,
    ],
  );
}

export async function saveProfileDocument(
  userId: string,
  input: { kind: string; storagePath: string; fileName: string; mimeType: string | null; sizeBytes: number | null },
) {
  const previous = await one<{ storage_path: string }>(
    "select storage_path from profile_documents where user_id = $1 and kind = $2",
    [userId, input.kind],
  );
  await sql(
    `insert into profile_documents (user_id, kind, storage_path, file_name, mime_type, size_bytes)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (user_id, kind) do update set
       storage_path = excluded.storage_path,
       file_name = excluded.file_name,
       mime_type = excluded.mime_type,
       size_bytes = excluded.size_bytes,
       created_at = now()`,
    [userId, input.kind, input.storagePath, input.fileName, input.mimeType, input.sizeBytes],
  );
  if (previous && previous.storage_path !== input.storagePath) {
    const stillUsed = await one("select id from documents where storage_path = $1", [previous.storage_path]);
    if (!stillUsed) await removeFile(previous.storage_path);
  }
}

export async function deleteProfileDocument(userId: string, kind: string) {
  const row = await one<{ storage_path: string }>(
    "delete from profile_documents where user_id = $1 and kind = $2 returning storage_path",
    [userId, kind],
  );
  if (!row) return;
  const stillUsed = await one("select id from documents where storage_path = $1", [row.storage_path]);
  if (!stillUsed) await removeFile(row.storage_path);
}

export async function getProfileDocumentByPath(storagePath: string) {
  const row = await one<Row>("select * from profile_documents where storage_path = $1", [storagePath]);
  if (!row) return null;
  return {
    userId: String(row.user_id),
    fileName: String(row.file_name),
    mimeType: (row.mime_type as string) ?? null,
  };
}

function samePerson(profile: ProfileVault, traveler: { passportNumber: string | null }) {
  const saved = profile.passportNumber.trim().toLowerCase();
  const current = (traveler.passportNumber ?? "").trim().toLowerCase();
  return Boolean(saved) && saved === current;
}

/** Copies the profile vault onto the first traveller when the passport number matches. */
export async function attachProfileDocuments(userId: string, applicationId: string) {
  const profile = await getProfileVault(userId);
  if (!profile?.documents.length) return;
  const travelers = await listTravelers(applicationId);
  const primary = travelers[0];
  if (!primary || !samePerson(profile, primary)) return;
  const existing = await listDocuments(applicationId);
  for (const doc of profile.documents) {
    if (doc.kind === "issued_visa") continue;
    const already = existing.find((item) => item.travelerId === primary.id && item.kind === doc.kind && item.status !== "rejected");
    if (already) continue;
    const storagePath = await copyStoredFile(userId, applicationId, doc.storagePath, doc.fileName, doc.mimeType);
    await addDocument({
      applicationId,
      travelerId: primary.id,
      kind: doc.kind,
      storagePath,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
    });
  }
}
