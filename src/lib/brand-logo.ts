import "server-only";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { asBytes } from "@/lib/bytes";
import { sql } from "@/lib/data/db";

const dir = path.join(process.cwd(), ".data", "brand");
const types: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const mimes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export type StoredLogo = { bytes: Buffer; mime: string };

async function diskName() {
  try {
    const names = await readdir(dir);
    return names.find((name) => name.startsWith("logo."));
  } catch {
    return undefined;
  }
}

export async function readLogoFile(file: File): Promise<{ ok: true; logo: StoredLogo } | { ok: false; error: string }> {
  const ext = types[file.type];
  if (!ext) return { ok: false, error: "استخدم PNG أو JPG أو WebP." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "الشعار أكبر من 2 ميغابايت." };
  return { ok: true, logo: { bytes: Buffer.from(await file.arrayBuffer()), mime: mimes[ext] } };
}

/** Persists the mark in the database so a new deploy does not wipe it. */
export async function storeBrandLogo(logo: StoredLogo | null) {
  await sql(`update site_settings set logo_bytes = $1, logo_mime = $2 where id = 1`, [
    logo?.bytes ?? null,
    logo?.mime ?? null,
  ]);
  const name = await diskName();
  if (name) await rm(path.join(dir, name), { force: true });
}

export async function readBrandLogo() {
  const row = await sql<{ logo_bytes: unknown; logo_mime: string | null }>(
    "select logo_bytes, logo_mime from site_settings where id = 1",
  );
  const stored = row[0];
  const bytes = asBytes(stored?.logo_bytes);
  if (bytes && stored?.logo_mime) return { bytes, mime: stored.logo_mime, attachment: false };

  const name = await diskName();
  if (!name) return null;
  const ext = name.split(".").pop() ?? "";
  const mime = mimes[ext];
  if (!mime) return null;
  return { bytes: await readFile(path.join(dir, name)), mime, attachment: ext === "svg" };
}

