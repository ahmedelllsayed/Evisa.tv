import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "@/lib/db/core";

const mimes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
};

const mediaKinds = new Set(["image", "hero", "flag", "video"]);

async function filesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await filesIn(full)));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

/** Copies files left on the container disk into Postgres before the next deploy deletes them. */
export async function importLeftoverFiles(db: Db, log: (message: string) => void = () => {}) {
  try {
    const media = await importDestinationMedia(db);
    const uploads = await importUploads(db);
    const logo = await importLogo(db);
    if (media || uploads || logo) log(`saved leftover files in the database: destinations ${media}, uploads ${uploads}, logo ${logo}`);
  } catch (error) {
    log(`could not import leftover files: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function importDestinationMedia(db: Db) {
  const root = path.join(process.cwd(), ".data", "destination-media");
  let count = 0;
  for (const file of await filesIn(root)) {
    const id = path.basename(path.dirname(file));
    const [kind, ext = ""] = path.basename(file).split(".");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !mediaKinds.has(kind) || !mimes[ext]) continue;
    const bytes = await readFile(file).catch(() => null);
    if (!bytes) continue;
    const rows = await db.query(
      `insert into destination_files (destination_id, kind, bytes, mime)
       values ($1, $2, $3, $4)
       on conflict (destination_id, kind) do nothing
       returning destination_id`,
      [id, kind, bytes, mimes[ext]],
    );
    count += rows.length;
  }
  return count;
}

async function importUploads(db: Db) {
  const root = path.join(process.cwd(), ".data", "uploads");
  let count = 0;
  for (const file of await filesIn(root)) {
    const stored = path.relative(root, file).split(path.sep).join("/");
    const ext = path.extname(file).slice(1).toLowerCase();
    const bytes = await readFile(file).catch(() => null);
    if (!bytes) continue;
    const rows = await db.query(
      `insert into stored_files (path, bytes, mime) values ($1, $2, $3)
       on conflict (path) do nothing
       returning path`,
      [stored, bytes, mimes[ext] ?? null],
    );
    count += rows.length;
  }
  return count;
}

async function importLogo(db: Db) {
  const dir = path.join(process.cwd(), ".data", "brand");
  const names = await readdir(dir).catch(() => [] as string[]);
  const name = names.find((item) => item.startsWith("logo."));
  if (!name) return 0;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimes[ext];
  if (!mime || mime === "image/svg+xml") return 0;
  const rows = await db.query(
    `update site_settings set logo_bytes = $1, logo_mime = $2
     where id = 1 and logo_bytes is null
     returning id`,
    [await readFile(path.join(dir, name)), mime],
  );
  return rows.length;
}
