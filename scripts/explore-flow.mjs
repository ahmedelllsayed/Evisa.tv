// Walks the reference visa page and the first step of "Start Application" (read-only; nothing is submitted).
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.argv[2] ?? "https://www.atlys.com/en-EG/visa/vietnam-visa";
const out = "../reference/flow";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
const close = page.locator('[role="dialog"] button').first();
if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
await page.waitForTimeout(800);
for (let i = 0; i < 9; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * 800);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/visa-${i}.png` });
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator("button", { hasText: "Start Application" }).filter({ visible: true }).last().click({ timeout: 10000, force: true }).catch((e) => console.log("no start", e.message));
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}/start-0.png` });
console.log("after start url", page.url());
await writeFile(`${out}/start-0.txt`, await page.evaluate(() => document.body.innerText));
await writeFile(`${out}/start-0.html`, await page.content());
await page.getByText("20", { exact: true }).filter({ visible: true }).first().click({ force: true }).catch((e) => console.log("no date", e.message));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/start-1.png` });
await page.getByText("Proceed to Application").filter({ visible: true }).first().click({ force: true }).catch((e) => console.log("no proceed", e.message));
for (let i = 2; i < 5; i++) {
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/start-${i}.png` });
  console.log("step", i, page.url());
}
await writeFile(`${out}/start-4.txt`, await page.evaluate(() => document.body.innerText));
await browser.close();
