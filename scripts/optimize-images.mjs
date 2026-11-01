// Script to optimize destination images
// Run with: node scripts/optimize-images.mjs

import { readdir, stat } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

const inputDir = "public/brand/destinations";
const quality = 80; // WebP quality (80 is good balance)

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? getFiles(path) : path;
    })
  );
  return files.flat();
}

async function optimizeImage(inputPath) {
  if (!inputPath.endsWith(".webp") && !inputPath.endsWith(".png") && !inputPath.endsWith(".jpg") && !inputPath.endsWith(".jpeg")) {
    return null;
  }

  try {
    const originalStats = await stat(inputPath);
    const originalSize = originalStats.size;

    // Optimize WebP
    await sharp(inputPath)
      .webp({ quality, effort: 6 })
      .toFile(inputPath + ".tmp");

    const optimizedStats = await stat(inputPath + ".tmp");
    const optimizedSize = optimizedStats.size;

    // Only replace if smaller
    if (optimizedSize < originalSize) {
      await sharp(inputPath + ".tmp").toFile(inputPath);

      // Clean up temp file
      try {
        const fs = await import("fs/promises");
        await fs.unlink(inputPath + ".tmp");
      } catch {}

      const saved = ((originalSize - optimizedSize) / originalSize) * 100;
      return {
        file: inputPath.replace("public/brand/destinations/", ""),
        original: (originalSize / 1024).toFixed(2),
        optimized: (optimizedSize / 1024).toFixed(2),
        saved: saved.toFixed(1),
      };
    } else {
      // Clean up temp file
      try {
        const fs = await import("fs/promises");
        await fs.unlink(inputPath + ".tmp");
      } catch {}
      return null;
    }
  } catch (error) {
    console.error(`Error optimizing ${inputPath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("Finding images...");
  const files = await getFiles(inputDir);
  const imageFiles = files.filter((f) => /\.(webp|png|jpe?g)$/i.test(f));

  console.log(`Found ${imageFiles.length} images\n`);

  let totalOriginal = 0;
  let totalOptimized = 0;
  let optimizedCount = 0;

  for (const file of imageFiles) {
    const stats = await stat(file);
    totalOriginal += stats.size;
  }

  console.log("Optimizing images...\n");

  for (const file of imageFiles) {
    const result = await optimizeImage(file);
    if (result) {
      console.log(`✓ ${result.file}: ${result.original}KB → ${result.optimized}KB (saved ${result.saved}%)`);
      totalOptimized += parseFloat(result.optimized) * 1024;
      optimizedCount++;
    }
  }

  // Calculate total after optimization
  for (const file of imageFiles) {
    const stats = await stat(file);
    totalOptimized += stats.size;
  }

  console.log(`\n✓ Total original: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`✓ Total optimized: ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`);
  console.log(`✓ Saved: ${(((totalOriginal - totalOptimized) / totalOriginal) * 100).toFixed(1)}% (${optimizedCount} files)`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
