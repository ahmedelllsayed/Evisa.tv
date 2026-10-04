import "server-only";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

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

export async function saveDestinationMedia(id: string, kind: DestinationMediaKind, file: File) {
  if (!validId(id) || !kinds.includes(kind)) return { ok: false as const, error: "تعذر حفظ الملف." };
  const video = kind === "video";
  const ext = (video ? videoTypes : imageTypes)[file.type];
  if (!ext) return { ok: false as const, error: video ? "استخدم MP4 أو WEBM." : "استخدم PNG أو JPG أو WebP." };
  const max = video ? 8 * 1024 * 1024 : 2 * 1024 * 1024;
  if (file.size > max) return { ok: false as const, error: video ? "الفيديو أكبر من 8 ميغابايت." : "الصورة أكبر من 2 ميغابايت." };
  const dir = folder(id);
  await mkdir(dir, { recursive: true });
  const names = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(names.filter((name) => name.startsWith(`${kind}.`)).map((name) => rm(path.join(dir, name), { force: true })));
  await writeFile(path.join(dir, `${kind}.${ext}`), Buffer.from(await file.arrayBuffer()));
  return { ok: true as const, url: `/destination-media/${id}/${kind}?v=${Date.now()}` };
}

export async function readDestinationMedia(id: string, kind: string) {
  if (!validId(id) || !kinds.includes(kind as DestinationMediaKind)) return null;
  const dir = folder(id);
  const names = await readdir(dir).catch(() => [] as string[]);
  const name = names.find((item) => item.startsWith(`${kind}.`));
  if (!name) return null;
  const ext = name.split(".").pop() ?? "";
  const mime = mimes[ext];
  if (!mime) return null;
  return { bytes: await readFile(path.join(dir, name)), mime };
}

export async function clearDestinationMedia(id: string) {
  if (!validId(id)) return;
  await rm(folder(id), { recursive: true, force: true });
}
