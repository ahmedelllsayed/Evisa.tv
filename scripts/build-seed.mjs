// Turns reference/data/home-cards.json into src/data/seed/destinations.json.
// Processing time is derived from the "Guaranteed Visa On" date relative to the capture time.
import { readFile, writeFile, stat, mkdir } from "node:fs/promises";

const src = "../reference/data/home-cards.json";
const cards = JSON.parse(await readFile(src, "utf8"));
const capturedAt = (await stat(src)).mtime;

// ISO code -> [lat, lng, cities[], region]
const geo = {
  TR: [39.0, 35.2, ["Istanbul", "Cappadocia", "Antalya"], "Europe"],
  MA: [31.8, -7.1, ["Marrakesh", "Casablanca", "Fes"], "Africa"],
  AU: [-25.3, 133.8, ["Sydney", "Melbourne", "Brisbane"], "Oceania"],
  ID: [-2.5, 118.0, ["Bali", "Jakarta", "Lombok"], "Asia"],
  GB: [54.0, -2.0, ["London", "Edinburgh", "Manchester"], "Europe"],
  TH: [15.9, 100.9, ["Bangkok", "Phuket", "Chiang Mai"], "Asia"],
  VN: [14.1, 108.3, ["Hanoi", "Ho Chi Minh City", "Da Nang"], "Asia"],
  MY: [4.2, 101.9, ["Kuala Lumpur", "Penang", "Langkawi"], "Asia"],
  US: [39.8, -98.6, ["New York", "Los Angeles", "Miami"], "Americas"],
  GE: [42.3, 43.4, ["Tbilisi", "Batumi"], "Asia"],
  CA: [56.1, -106.3, ["Toronto", "Vancouver", "Montreal"], "Americas"],
  MV: [3.2, 73.2, ["Malé"], "Asia"],
  AZ: [40.1, 47.6, ["Baku", "Gabala"], "Asia"],
  BH: [26.0, 50.5, ["Manama"], "Middle East"],
  HK: [22.3, 114.2, ["Hong Kong"], "Asia"],
  LK: [7.9, 80.8, ["Colombo", "Kandy", "Galle"], "Asia"],
  AM: [40.1, 45.0, ["Yerevan"], "Asia"],
  NZ: [-40.9, 174.9, ["Auckland", "Queenstown", "Wellington"], "Oceania"],
  KH: [12.6, 104.9, ["Phnom Penh", "Siem Reap"], "Asia"],
  NP: [28.4, 84.1, ["Kathmandu", "Pokhara"], "Asia"],
  UZ: [41.4, 64.6, ["Tashkent", "Samarkand", "Bukhara"], "Asia"],
  TZ: [-6.4, 34.9, ["Zanzibar", "Dar es Salaam", "Arusha"], "Africa"],
  IE: [53.4, -8.2, ["Dublin", "Galway", "Cork"], "Europe"],
  ET: [9.1, 40.5, ["Addis Ababa"], "Africa"],
  LA: [19.9, 102.5, ["Vientiane", "Luang Prabang"], "Asia"],
  QA: [25.4, 51.2, ["Doha"], "Middle East"],
  MZ: [-18.7, 35.5, ["Maputo"], "Africa"],
  TG: [8.6, 0.8, ["Lomé"], "Africa"],
  CD: [-4.0, 21.8, ["Kinshasa"], "Africa"],
  DJ: [11.8, 42.6, ["Djibouti City"], "Africa"],
  AG: [17.1, -61.8, ["St. John's"], "Americas"],
  PG: [-6.3, 143.9, ["Port Moresby"], "Oceania"],
  SL: [8.5, -11.8, ["Freetown"], "Africa"],
  BS: [25.0, -77.4, ["Nassau"], "Americas"],
  GA: [-0.8, 11.6, ["Libreville"], "Africa"],
  GH: [7.9, -1.0, ["Accra", "Kumasi"], "Africa"],
  UG: [1.4, 32.3, ["Kampala", "Entebbe"], "Africa"],
  FJ: [-17.7, 178.1, ["Nadi", "Suva"], "Oceania"],
  CM: [7.4, 12.4, ["Yaoundé", "Douala"], "Africa"],
  PK: [30.4, 69.3, ["Islamabad", "Lahore", "Karachi"], "Asia"],
  BF: [12.2, -1.6, ["Ouagadougou"], "Africa"],
  VE: [6.4, -66.6, ["Caracas"], "Americas"],
  TT: [10.7, -61.2, ["Port of Spain"], "Americas"],
  KN: [17.4, -62.8, ["Basseterre"], "Americas"],
  AO: [-11.2, 17.9, ["Luanda"], "Africa"],
  SO: [5.2, 46.2, ["Mogadishu"], "Africa"],
  TD: [15.5, 18.7, ["N'Djamena"], "Africa"],
  GW: [11.8, -15.2, ["Bissau"], "Africa"],
  BI: [-3.4, 29.9, ["Gitega", "Bujumbura"], "Africa"],
  ST: [0.2, 6.6, ["São Tomé"], "Africa"],
  KE: [-0.02, 37.9, ["Nairobi", "Mombasa"], "Africa"],
  BB: [13.2, -59.5, ["Bridgetown"], "Americas"],
  MO: [22.2, 113.5, ["Macao"], "Asia"],
  GN: [9.9, -9.7, ["Conakry"], "Africa"],
  SS: [6.9, 31.3, ["Juba"], "Africa"],
};

const slugOverrides = { "/en-EG/turkey-e-visa": "turkey-visa", "/en-EG/morocco-e-visa": "morocco-visa" };

const docKey = (d) =>
  ({
    passport: "passport",
    photo: "photo",
    "bank statements": "bank_statements",
    "income tax returns": "income_tax_returns",
    "us/uk/schengen visa": "us_uk_schengen_visa",
  })[d.trim().toLowerCase()];

const fix = (s) => (s ?? "").replace(/\u00a0/g, " ").trim();

const out = cards.map((c, i) => {
  const imageCode = c.image.match(/\/([A-Z]{2})\.avif/)[1];
  const code = imageCode === "SM" && /pakistan/.test(c.href) ? "PK" : imageCode;
  const [lat, lng, cities, region] = geo[code] ?? [0, 0, [], "Other"];
  const slug = slugOverrides[c.href] ?? c.href.split("/").pop();
  const visaRequired = Boolean(c.type);
  const total = Number(fix(c.fees).replace(/[^0-9]/g, "")) || 0;
  const govFee = Math.round(total * 0.54);
  let processingHours = null;
  if (c.eta) {
    const eta = new Date(`${c.eta.replace(",", "")} GMT+0300`);
    processingHours = Math.max(1, Math.round((eta.getTime() - capturedAt.getTime()) / 36e5));
  }
  const type = (c.type ?? "").toLowerCase();
  const documents = (c.documents ?? "").split(",").map(docKey).filter(Boolean);
  if (visaRequired && !documents.includes("passport")) documents.push("passport");
  const express = processingHours && processingHours > 72;
  return {
    code,
    slug,
    name: fix(c.name),
    region,
    visaRequired,
    visaType: visaRequired ? (type === "sticker" ? "sticker" : "e-visa") : "visa-free",
    validity: fix(c.validity) || null,
    stay: fix(c.validity) || null,
    entry: "Single",
    acceptedAt: "All Ports of Entry",
    method: type === "sticker" ? "Embassy submission" : "Paperless",
    govFee,
    serviceFee: total - govFee,
    processingHours,
    expressHours: express ? Math.round(processingHours * 0.4) : null,
    expressFee: express ? Math.round(total * 0.5) : null,
    documents,
    image: `/brand/destinations/${imageCode.toLowerCase()}.webp`,
    heroImage: `/brand/destinations/${imageCode.toLowerCase()}-wide.webp`,
    flag: `/brand/flags/${code.toLowerCase()}.png`,
    lat,
    lng,
    cities,
    sortOrder: i + 1,
  };
});

await mkdir("src/data/seed", { recursive: true });
await writeFile("src/data/seed/destinations.json", JSON.stringify(out, null, 2) + "\n");
console.log("destinations", out.length, "captured", capturedAt.toISOString());
