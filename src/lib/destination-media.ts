import "server-only";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { asBytes } from "@/lib/bytes";
import { one, sql } from "@/lib/data/db";

const kinds = ["image", "hero", "flag", "video"] as const;
export type DestinationMediaKind = (typeof kinds)[number];

const imageTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const videoTypes: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const mimes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

function folder(id: string) {
  return path.join(process.cwd(), ".data", "destination-media", id);
}

function validId(id: string) {
  return /^[0-9a-f-]{36}$/i.test(id);
}

export async function listStoredDestinationMedia(ids: string[]) {
  const valid = ids.filter(validId);
  if (!valid.length) return [];
  return sql<{ destination_id: string; kind: string }>(
    `select destination_id, kind from destination_files where destination_id::text = any(string_to_array($1, ','))`,
    [valid.join(",")],
  );
}

export async function saveDestinationMedia(id: string, kind: DestinationMediaKind, file: File) {
  if (!validId(id) || !kinds.includes(kind)) return { ok: false as const, error: "تعذر حفظ الملف." };
  const video = kind === "video";
  const ext = (video ? videoTypes : imageTypes)[file.type];
  if (!ext) return { ok: false as const, error: video ? "استخدم MP4 أو WEBM." : "استخدم PNG أو JPG أو WebP." };
  const max = video ? 8 * 1024 * 1024 : 2 * 1024 * 1024;
  if (file.size > max) return { ok: false as const, error: video ? "الفيديو أكبر من 8 ميغابايت." : "الصورة أكبر من 2 ميغابايت." };
  const mime = mimes[ext];
  if (!mime) return { ok: false as const, error: "تعذر حفظ الملف." };
  const bytes = Buffer.from(await file.arrayBuffer());
  await sql(
    `insert into destination_files (destination_id, kind, bytes, mime)
     values ($1, $2, $3, $4)
     on conflict (destination_id, kind) do update set bytes = excluded.bytes, mime = excluded.mime`,
    [id, kind, bytes, mime],
  );
  return { ok: true as const, url: `/destination-media/${id}/${kind}?v=${Date.now()}` };
}

export async function readDestinationMedia(id: string, kind: string) {
  if (!validId(id) || !kinds.includes(kind as DestinationMediaKind)) return null;
  const row = await one<{ bytes: unknown; mime: string }>(
    `select bytes, mime from destination_files where destination_id = $1 and kind = $2`,
    [id, kind],
  );
  const stored = row ? asBytes(row.bytes) : null;
  if (stored && row?.mime) return { bytes: stored, mime: row.mime };
  const dir = folder(id);
  const names = await readdir(dir).catch(() => [] as string[]);
  const name = names.find((item) => item.startsWith(`${kind}.`));
  if (!name) return null;
  const ext = name.split(".").pop() ?? "";
  const mime = mimes[ext];
  if (!mime) return null;
  const bytes = await readFile(path.join(dir, name));
  await sql(
    `insert into destination_files (destination_id, kind, bytes, mime)
     values ($1, $2, $3, $4)
     on conflict (destination_id, kind) do nothing`,
    [id, kind, bytes, mime],
  );
  return { bytes, mime };
}

export async function clearDestinationMedia(id: string) {
  if (!validId(id)) return;
  await sql(`delete from destination_files where destination_id = $1`, [id]);
  await rm(folder(id), { recursive: true, force: true });
}
