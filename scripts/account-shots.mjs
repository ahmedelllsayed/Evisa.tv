// Signs in to the local dev server as a demo customer and screenshots the account area.
// Usage: node scripts/account-shots.mjs [outDir] [locale]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:3100";
const outDir = process.argv[2] || path.join(process.cwd(), "compare", "account");
const locale = process.argv[3] || "ar-EG";
const email = process.env.CUSTOMER_EMAIL || "omar.khaled@example.com";
const tabs = ["overview", "orders", "visas", "files", "payments", "profile"];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`${page.url()}: console ${message.text().slice(0, 200)}`);
});

await page.goto(`${base}/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/account`)}`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', email);
await page.click('form button:not([type="button"])');
await page.waitForSelector("span.font-mono", { timeout: 30000 });
const code = (await page.textContent("span.font-mono"))?.trim() ?? "";
await page.fill('input[autocomplete="one-time-code"]', code);
await page.click('form button:not([type="button"])');
await page.waitForURL(/\/account/, { timeout: 60000 });

async function shoot(name, url, { full = true } = {}) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: full });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${name}: ${page.url()} overflow=${overflow}`);
}

for (const tab of tabs) await shoot(`account-${tab}`, `${base}/${locale}/account?tab=${tab}`);
await shoot("profile", `${base}/${locale}/account/profile`);
await page.goto(`${base}/${locale}/account?tab=orders`, { waitUntil: "networkidle" });
const detail = await page.evaluate(() =>
  [...document.querySelectorAll("a")].map((a) => a.getAttribute("href") || "").filter((h) => /\/account\/applications\/[0-9a-f-]{36}/.test(h)),
);
for (const [index, link] of [...new Set(detail)].slice(0, 3).entries()) await shoot(`application-${index + 1}`, `${base}${link}`);

await page.setViewportSize({ width: 390, height: 844 });
await shoot("mobile-overview", `${base}/${locale}/account`);
await shoot("mobile-profile", `${base}/${locale}/account/profile`);
if (detail[0]) await shoot("mobile-application", `${base}${detail[0]}`);
console.log(errors.length ? `page errors:\n${[...new Set(errors)].join("\n")}` : "no page errors");
await browser.close();
