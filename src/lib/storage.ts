import "server-only";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { asBytes } from "@/lib/bytes";
import { one, sql } from "@/lib/data/db";
import { supabaseEnabled } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const BUCKET = "documents";
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "file";
}

function diskPath(storagePath: string) {
  const target = path.resolve(LOCAL_ROOT, storagePath);
  if (!target.startsWith(LOCAL_ROOT)) throw new Error("Invalid path");
  return target;
}

async function remember(storagePath: string, bytes: Buffer, mime: string | null) {
  await sql(
    `insert into stored_files (path, bytes, mime) values ($1, $2, $3)
     on conflict (path) do update set bytes = excluded.bytes, mime = excluded.mime`,
    [storagePath, bytes, mime],
  );
}

async function recall(storagePath: string) {
  const row = await one<{ bytes: unknown }>("select bytes from stored_files where path = $1", [storagePath]);
  return row ? asBytes(row.bytes) : null;
}

/** Stores a file as <userId>/<applicationId>/<uuid>-<name> and returns the storage path. */
export async function storeFile(userId: string, applicationId: string, file: File) {
  const storagePath = `${userId}/${applicationId}/${randomUUID()}-${safeName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await remember(storagePath, bytes, file.type || null);
  if (supabaseEnabled) {
    const { error } = await createSupabaseAdminClient()
      .storage.from(BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
  }
  return storagePath;
}

export async function readStoredBytes(storagePath: string) {
  const stored = await recall(storagePath);
  if (stored) return stored;
  if (supabaseEnabled) {
    const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).download(storagePath);
    if (!error && data) {
      const bytes = Buffer.from(await data.arrayBuffer());
      await remember(storagePath, bytes, null);
      return bytes;
    }
  }
  const bytes = await readFile(diskPath(storagePath));
  await remember(storagePath, bytes, null);
  return bytes;
}

/** Copies an existing stored file into a new application path so deletes stay independent. */
export async function copyStoredFile(userId: string, applicationId: string, sourcePath: string, fileName: string, mimeType: string | null) {
  const bytes = await readStoredBytes(sourcePath);
  const file = new File([new Uint8Array(bytes)], fileName, { type: mimeType || "application/octet-stream" });
  return storeFile(userId, applicationId, file);
}

export async function removeFile(storagePath: string) {
  await sql("delete from stored_files where path = $1", [storagePath]);
  if (supabaseEnabled) {
    await createSupabaseAdminClient().storage.from(BUCKET).remove([storagePath]);
  }
  await rm(diskPath(storagePath), { force: true }).catch(() => undefined);
}

/** Either a short-lived signed URL (Supabase) or the raw bytes (local storage). */
export async function readFileForDownload(storagePath: string): Promise<{ url: string } | { bytes: Buffer }> {
  const stored = await recall(storagePath);
  if (stored) return { bytes: stored };
  if (supabaseEnabled) {
    const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrl(storagePath, 60);
    if (error || !data) throw new Error(error?.message ?? "Could not sign URL");
    return { url: data.signedUrl };
  }
  const bytes = await readFile(diskPath(storagePath));
  await remember(storagePath, bytes, null);
  return { bytes };
}
