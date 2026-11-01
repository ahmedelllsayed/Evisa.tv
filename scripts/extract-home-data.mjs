// Extracts destination card data from the reference homepage into JSON.
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";

const url = process.argv[2] ?? "https://www.atlys.com/en-EG";
const out = process.argv[3] ?? "../reference/data/home-cards.json";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 700) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 100));
  }
});
await page.waitForTimeout(1500);

const cards = await page.evaluate(() => {
  const anchors = [...document.querySelectorAll("#grid-map-view-wrapper-v2 a[href]")];
  return anchors.map((a) => {
    const img = a.querySelector("img");
    const flag = a.querySelectorAll("img")[1];
    const q = (sel) => a.querySelector(sel)?.textContent?.trim() ?? null;
    const byTestId = (suffix) =>
      [...a.querySelectorAll("[test-id]")].find((el) => el.getAttribute("test-id").endsWith(suffix))
        ?.textContent?.trim() ?? null;
    const docsLabel = [...a.querySelectorAll("p")].find((p) => /Documents Needed/i.test(p.textContent));
    const eta = [...a.querySelectorAll("p")].find((p) => /Guaranteed Visa On/i.test(p.textContent));
    return {
      name: img?.getAttribute("alt"),
      href: a.getAttribute("href"),
      image: img?.getAttribute("src"),
      flag: flag?.getAttribute("src"),
      title: q(".font-denton"),
      type: byTestId("home-visa-type"),
      validity: byTestId("home-visa-validity"),
      fees: byTestId("home-visa-fees"),
      documents: docsLabel?.nextElementSibling?.textContent?.trim() ?? null,
      eta: eta?.nextElementSibling?.textContent?.trim() ?? null,
      text: a.innerText.replace(/\s+/g, " ").slice(0, 300),
    };
  });
});

await mkdir(new URL("../reference/data/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1").replace("/atlys-clone/../", "/"), { recursive: true }).catch(() => {});
await writeFile(out, JSON.stringify(cards, null, 2));
console.log("cards", cards.length);
await browser.close();
