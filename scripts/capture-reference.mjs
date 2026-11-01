// Captures full-page screenshots and rendered HTML of the reference site.
// Usage: node scripts/capture-reference.mjs [baseUrl] [outDir] [pageFilter]
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "https://www.atlys.com/en-EG";
const outDir = path.resolve(process.argv[3] ?? "../reference/capture");
const filter = process.argv[4];

const pages = [
  ["home", ""],
  ["turkey-e-visa", "/turkey-e-visa"],
  ["visa-vietnam", "/visa/vietnam-visa"],
  ["visa-uk", "/visa/uk-visa"],
  ["on-time-guaranteed", "/on-time-guaranteed"],
  ["rejection-recovery", "/rejection-recovery"],
  ["wall-of-love", "/wall-of-love"],
  ["passport-index", "/passport-index"],
  ["visa-requirements", "/tools/visa-requirements"],
  ["visa-photo-maker", "/tools/visa-photo-maker"],
  ["price-change-log", "/transparency/price-change-log"],
  ["refunds-policy", "/transparency/refunds-policy"],
  ["status", "/transparency/status"],
  ["contact", "/contact"],
  ["partners", "/partners"],
  ["newsroom", "/newsroom"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["emergency-care", "/emergency-care"],
  ["sign-in", "/sign-in"],
];

const viewports = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });

for (const [vpName, viewport] of viewports) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: vpName === "mobile",
    hasTouch: vpName === "mobile",
    locale: "en-EG",
  });
  const page = await context.newPage();
  for (const [name, route] of pages) {
    if (filter && !name.includes(filter)) continue;
    try {
      await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(3500);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(outDir, `${name}-${vpName}.png`), fullPage: true });
      if (vpName === "desktop") {
        const html = await page.content();
        await writeFile(path.join(outDir, `${name}.html`), html);
        const text = await page.evaluate(() => document.body.innerText);
        await writeFile(path.join(outDir, `${name}.txt`), text);
      }
      console.log("ok", vpName, name, page.url());
    } catch (err) {
      console.log("fail", vpName, name, String(err).slice(0, 200));
    }
  }
  await context.close();
}
await browser.close();
