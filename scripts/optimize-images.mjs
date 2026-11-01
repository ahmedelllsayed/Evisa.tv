import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const destinationDir = "public/brand/destinations";
const guaranteePath = "public/brand/clp/guarantee.svg";
const quality = 80;

async function filesIn(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? filesIn(path) : [path];
    }),
  );
  return nested.flat();
}

async function optimizeRaster(path) {
  if (!/\.(webp|png|jpe?g)$/i.test(path) || path.endsWith(".tmp") || path.endsWith(".opt")) return null;
  const before = (await stat(path)).size;
  const output = await sharp(path).webp({ quality, effort: 6 }).toBuffer();
  if (output.length >= before) return null;
  await writeFile(path, output);
  return { path, before, after: output.length };
}

async function optimizeGuarantee() {
  const svg = await readFile(guaranteePath, "utf8");
  const before = Buffer.byteLength(svg);
  const match = svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (!match) return null;
  const source = Buffer.from(match[1], "base64");
  const meta = await sharp(source).metadata();
  let pipeline = sharp(source);
  if ((meta.width ?? 0) > 192 || (meta.height ?? 0) > 192) {
    pipeline = pipeline.resize({ width: 192, height: 192, fit: "inside", withoutEnlargement: true });
  }
  const compressed = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  if (compressed.length >= source.length) return null;
  const next = svg.replace(match[0], `data:image/png;base64,${compressed.toString("base64")}`);
  const after = Buffer.byteLength(next);
  if (after >= before) return null;
  await writeFile(guaranteePath, next);
  return { path: guaranteePath, before, after };
}

function line(result) {
  const saved = ((result.before - result.after) / result.before) * 100;
  console.log(`${result.path}: ${(result.before / 1024).toFixed(1)}KB -> ${(result.after / 1024).toFixed(1)}KB (${saved.toFixed(1)}%)`);
}

const images = (await filesIn(destinationDir)).filter((path) => /\.(webp|png|jpe?g)$/i.test(path));
let beforeTotal = 0;
let afterTotal = 0;
let changed = 0;
for (const path of images) beforeTotal += (await stat(path)).size;
for (const path of images) {
  try {
    const result = await optimizeRaster(path);
    if (!result) continue;
    changed += 1;
    line(result);
  } catch (error) {
    console.error(`skip ${path}: ${error instanceof Error ? error.message : error}`);
  }
}
for (const path of images) afterTotal += (await stat(path)).size;
const guarantee = await optimizeGuarantee();
if (guarantee) {
  changed += 1;
  beforeTotal += guarantee.before;
  afterTotal += guarantee.after;
  line(guarantee);
}
const saved = beforeTotal === 0 ? 0 : ((beforeTotal - afterTotal) / beforeTotal) * 100;
console.log(`files ${images.length}, changed ${changed}`);
console.log(`total ${(beforeTotal / 1024 / 1024).toFixed(2)}MB -> ${(afterTotal / 1024 / 1024).toFixed(2)}MB (${saved.toFixed(1)}%)`);
