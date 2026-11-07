// Screenshots the public information pages on the local dev server and reports overflow and page errors.
// Usage: node scripts/public-shots.mjs [outDir] [locale] [route,route]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:3100";
const outDir = process.argv[2] || path.join(process.cwd(), "compare", "public");
const locale = process.argv[3] || "ar-EG";
const only = process.argv[4] ? process.argv[4].split(",") : null;
const routes = [
  "tools/visa-requirements",
  "tools/visa-photo-maker",
  "passport-index",
  "emergency-care",
  "rejection-recovery",
  "contact",
  "security",
  "editorial-policy",
  "transparency/refunds-policy",
  "transparency/price-change-log",
  "transparency/status",
  "privacy",
  "terms",
  "on-time-guaranteed",
  "wall-of-love",
  "events",
].filter((route) => !only || only.includes(route));

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "msedge" });
const errors = [];
for (const [width, height, suffix] of [
  [1440, 1000, ""],
  [390, 844, "-mobile"],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message.slice(0, 300)}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${page.url()}: console ${message.text().slice(0, 300)}`);
  });
  for (const route of routes) {
    const response = await page.goto(`${base}/${locale}/${route}`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(600);
    const name = route.replace(/\//g, "_") + suffix;
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`${name}: ${response?.status()} overflow=${overflow}`);
  }
  await page.close();
}
console.log(errors.length ? `page errors:\n${[...new Set(errors)].join("\n")}` : "no page errors");
await browser.close();
