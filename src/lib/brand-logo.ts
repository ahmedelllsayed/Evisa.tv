import "server-only";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

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

async function existing() {
  try {
    const names = await readdir(dir);
    return names.find((name) => name.startsWith("logo."));
  } catch {
    return undefined;
  }
}

export async function saveBrandLogo(file: File) {
  const ext = types[file.type];
  if (!ext) return { ok: false as const, error: "استخدم PNG أو JPG أو WebP." };
  if (file.size > 2 * 1024 * 1024) return { ok: false as const, error: "الشعار أكبر من 2 ميغابايت." };
  await clearBrandLogo();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `logo.${ext}`), Buffer.from(await file.arrayBuffer()));
  return { ok: true as const, url: `/brand-logo?v=${Date.now()}` };
}

export async function clearBrandLogo() {
  const name = await existing();
  if (name) await rm(path.join(dir, name), { force: true });
}

export async function readBrandLogo() {
  const name = await existing();
  if (!name) return null;
  const ext = name.split(".").pop() ?? "";
  const mime = mimes[ext];
  if (!mime) return null;
  return { bytes: await readFile(path.join(dir, name)), mime, attachment: ext === "svg" };
}
