import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { supabaseEnabled } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const BUCKET = "documents";
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "file";
}

/** Stores a file as <userId>/<applicationId>/<uuid>-<name> and returns the storage path. */
export async function storeFile(userId: string, applicationId: string, file: File) {
  const storagePath = `${userId}/${applicationId}/${randomUUID()}-${safeName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (supabaseEnabled) {
    const { error } = await createSupabaseAdminClient()
      .storage.from(BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
  } else {
    const target = path.join(LOCAL_ROOT, storagePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  return storagePath;
}

export async function readStoredBytes(storagePath: string) {
  if (supabaseEnabled) {
    const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).download(storagePath);
    if (error || !data) throw new Error(error?.message ?? "Could not read file");
    return Buffer.from(await data.arrayBuffer());
  }
  const target = path.resolve(LOCAL_ROOT, storagePath);
  if (!target.startsWith(LOCAL_ROOT)) throw new Error("Invalid path");
  return readFile(target);
}

/** Copies an existing stored file into a new application path so deletes stay independent. */
export async function copyStoredFile(userId: string, applicationId: string, sourcePath: string, fileName: string, mimeType: string | null) {
  const bytes = await readStoredBytes(sourcePath);
  const file = new File([new Uint8Array(bytes)], fileName, { type: mimeType || "application/octet-stream" });
  return storeFile(userId, applicationId, file);
}

export async function removeFile(storagePath: string) {
  if (supabaseEnabled) {
    await createSupabaseAdminClient().storage.from(BUCKET).remove([storagePath]);
  } else {
    await rm(path.join(LOCAL_ROOT, storagePath), { force: true });
  }
}

/** Either a short-lived signed URL (Supabase) or the raw bytes (local storage). */
export async function readFileForDownload(storagePath: string): Promise<{ url: string } | { bytes: Buffer }> {
  if (supabaseEnabled) {
    const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrl(storagePath, 60);
    if (error || !data) throw new Error(error?.message ?? "Could not sign URL");
    return { url: data.signedUrl };
  }
  const target = path.resolve(LOCAL_ROOT, storagePath);
  if (!target.startsWith(LOCAL_ROOT)) throw new Error("Invalid path");
  return { bytes: await readFile(target) };
}
