import { chromium } from "playwright";
import { tmpdir } from "node:os";
import { join } from "node:path";

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto("http://localhost:3000/en-EG", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByRole("button", { name: "Map", exact: true }).click();
await page.waitForSelector(".leaflet-container", { timeout: 20000 });
await page.waitForSelector(".visa-pin-link", { timeout: 20000 });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const pills = [...document.querySelectorAll(".visa-pin-pill")].slice(0, 8).map((el) => ({
    name: el.querySelector("strong")?.textContent,
    date: el.querySelector("em")?.textContent,
  }));
  const map = document.querySelector(".visa-map")?.getBoundingClientRect();
  const header = document.querySelector("header")?.getBoundingClientRect();
  const footer = document.querySelector("footer");
  return {
    pills,
    flagOnly: document.querySelectorAll(".visa-pin-link.is-flag").length,
    pillCount: document.querySelectorAll(".visa-pin-pill").length,
    attribution: document.querySelector(".leaflet-control-attribution")?.textContent?.trim(),
    pause: !!document.querySelector('[aria-label="Pause"]'),
    zoomIn: !!document.querySelector('[aria-label="Zoom in"]'),
    zoomOut: !!document.querySelector('[aria-label="Zoom out"]'),
    locate: !!document.querySelector('[aria-label="Your location"]'),
    tiles: document.querySelectorAll(".leaflet-tile-loaded").length,
    tileNodes: document.querySelectorAll(".leaflet-tile").length,
    map,
    header,
    innerHeight: window.innerHeight,
    footerHidden: !footer || getComputedStyle(footer).display === "none",
    searchCentered: !!document.querySelector("header button[aria-label='Search Country']"),
  };
});
console.log(JSON.stringify(info, null, 2));
console.log("ERRORS", errors.slice(0, 12));
const shot = join(tmpdir(), "atlys-map-en.png");
await page.screenshot({ path: shot });
console.log("SHOT", shot);

const link = page.locator(".visa-pin-link").first();
const href = await link.getAttribute("href");
console.log("HREF", href);
await link.click({ timeout: 10000 });
await page.waitForURL(/\/visa\//, { timeout: 20000 });
console.log("LANDED", page.url());
await browser.close();
