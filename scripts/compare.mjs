// Visual snapshots of the local site at 390 and 1440 widths.
// Usage: npm run ref:compare   (dev server must already be running)
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.env.BASE_URL ?? "http://localhost:3000/en-EG";
const outDir = path.resolve("compare");
await mkdir(outDir, { recursive: true });

const pages = [
  { name: "home", path: "" },
  { name: "visa-vietnam", path: "/visa/vietnam-visa" },
  { name: "on-time", path: "/on-time-guaranteed" },
  { name: "contact", path: "/contact" },
  { name: "sign-in", path: "/sign-in" },
  { name: "passport-index", path: "/passport-index" },
  { name: "wall-of-love", path: "/wall-of-love" },
  { name: "photo-maker", path: "/tools/visa-photo-maker" },
  { name: "requirements", path: "/tools/visa-requirements" },
  { name: "rejection", path: "/rejection-recovery" },
];

const widths = [390, 1440];

const browser = await chromium.launch({ channel: "msedge", headless: true }).catch(() =>
  chromium.launch({ headless: true }),
);

for (const w of widths) {
  const h = w < 800 ? 844 : 900;
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: w < 800,
    hasTouch: w < 800,
  });
  const page = await context.newPage();
  for (const p of pages) {
    const url = `${base}${p.path}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2500);
      const file = path.join(outDir, `${p.name}-${w}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log("wrote", file);
    } catch (err) {
      console.error("failed", url, err.message);
    }
  }
  await context.close();
}

await browser.close();
console.log("compare screenshots saved to", outDir);
