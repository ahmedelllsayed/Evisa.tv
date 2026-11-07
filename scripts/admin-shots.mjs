// Signs in to the local dev server as the development admin and screenshots every admin section.
// Usage: node scripts/admin-shots.mjs [outDir] [route,route]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:3100";
const outDir = process.argv[2] || path.join(process.cwd(), "compare", "admin");
const only = process.argv[3] ? process.argv[3].split(",") : null;
const routes = [
  "", "queue", "growth", "reports", "payments", "applications", "messages", "staff", "users",
  "destinations", "events", "holidays", "pages", "faqs", "reviews", "settings", "citizenships", "fees", "audit",
].filter((route) => !only || only.includes(route || "overview"));

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
await page.goto(`${base}/en-EG/sign-in?next=%2Fen-EG%2Fadmin`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || "admin@example.com");
await page.click('form button:not([type="button"])');
await page.waitForSelector("text=Dev code", { timeout: 30000 });
const code = (await page.textContent("span.font-mono"))?.trim() ?? "";
await page.fill('input[autocomplete="one-time-code"]', code);
await page.click('form button:not([type="button"])');
await page.waitForURL(/\/admin/, { timeout: 60000 });

for (const route of routes) {
  const name = route || "overview";
  await page.goto(`${base}/en-EG/admin${route ? `/${route}` : ""}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${name}: ${page.url()} overflow=${overflow}`);
}
if (!only || only.includes("application-detail")) {
  await page.goto(`${base}/en-EG/admin/applications`, { waitUntil: "networkidle" });
  const link = await page.evaluate(() =>
    [...document.querySelectorAll("a")].map((a) => a.getAttribute("href") || "").find((h) => /\/admin\/applications\/[0-9a-f-]{36}/.test(h)),
  );
  if (link) {
    await page.goto(`${base}${link}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, "application-detail.png") });
    console.log(`application-detail: ${page.url()}`);
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/en-EG/admin`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outDir, "overview-mobile.png") });
console.log(`mobile overflow=${await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)}`);
console.log(errors.length ? `page errors:\n${errors.join("\n")}` : "no page errors");
await browser.close();
