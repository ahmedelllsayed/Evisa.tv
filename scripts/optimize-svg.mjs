// Script to optimize guarantee.svg
// Run with: node scripts/optimize-svg.mjs

import { readFile, writeFile } from "fs/promises";
import { optimize } from "svgo";

const inputPath = "public/brand/clp/guarantee.svg";
const outputPath = "public/brand/clp/guarantee.svg";

try {
  console.log("Reading SVG...");
  const svgString = await readFile(inputPath, "utf8");
  const originalSize = Buffer.byteLength(svgString, "utf8");

  console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);

  console.log("Optimizing...");
  const result = optimize(svgString, {
    multipass: true,
    plugins: [
      { name: "preset-default" },
      { name: "removeViewBox", active: false },
      { name: "removeDimensions", active: true },
      { name: "removeMetadata", active: true },
      { name: "removeComments", active: true },
      { name: "removeEditorsNSData", active: true },
      { name: "cleanupIds", active: true },
      { name: "minifyStyles", active: true },
      { name: "convertStyleToAttrs", active: true },
      { name: "removeUselessStrokeAndFill", active: true },
      { name: "convertTransform", active: true },
      { name: "cleanupNumericValues", active: true, params: { floatPrecision: 2 } },
      { name: "convertPathData", active: true, params: { floatPrecision: 2 } },
    ],
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const optimizedSize = Buffer.byteLength(result.data, "utf8");

  await writeFile(outputPath, result.data, "utf8");

  console.log(`✓ Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
  console.log(`✓ Saved: ${(((originalSize - optimizedSize) / originalSize) * 100).toFixed(1)}%`);
  console.log(`✓ Written to: ${outputPath}`);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
