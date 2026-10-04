// Opens each homepage filter / search popover on the reference site and records its contents (read-only).
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const out = "../reference/home-ui";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://www.atlys.com/en-EG", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);

const labels = ["Visa delivery:", "Type:", "Documents:", "Holidays:"];
for (const [i, label] of labels.entries()) {
  await page.getByText(label, { exact: true }).first().click({ force: true }).catch((e) => console.log("x", label, e.message));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/filter-${i}.png` });
  const text = await page.evaluate(() => {
    const pop = document.querySelector('.absolute.left-1\\/2.z-\\[9999\\]');
    return pop ? pop.innerText : "";
  });
  await writeFile(`${out}/filter-${i}.txt`, text);
  await page.keyboard.press("Escape");
  await page.mouse.click(20, 600);
  await page.waitForTimeout(600);
}
await page.locator('[test-id="search-country-button"]').click({ force: true }).catch((e) => console.log("x search", e.message));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/search.png` });
await page.keyboard.type("vie");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/search-typed.png` });
await page.keyboard.press("Escape");
await page.mouse.click(20, 600);
await page.getByText("Events", { exact: true }).first().click({ force: true }).catch(() => {});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/events.png` });
await writeFile(`${out}/events.txt`, await page.evaluate(() => document.body.innerText.slice(0, 4000)));
await browser.close();
console.log("done");
