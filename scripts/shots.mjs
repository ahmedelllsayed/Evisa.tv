// Viewport screenshots at successive scroll offsets.
// Usage: node scripts/shots.mjs <url> <name> [width] [count] [outDir]
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [url, name, width = "1440", count = "3", out = "../reference/shots"] = process.argv.slice(2);
const outDir = path.resolve(out);
await mkdir(outDir, { recursive: true });
const w = Number(width);
const h = w < 800 ? 844 : 900;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: w, height: h },
  isMobile: w < 800,
  hasTouch: w < 800,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
for (let i = 0; i < Number(count); i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * (h - 100));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}-${w}-${i}.png`) });
}
await browser.close();
console.log("done");
