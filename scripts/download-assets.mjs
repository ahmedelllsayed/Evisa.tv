// Downloads destination card images and flags listed in reference/data/home-cards.json
// into public/brand so the app has no runtime dependency on the reference CDN.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const cards = JSON.parse(await readFile("../reference/data/home-cards.json", "utf8"));
await mkdir("public/brand/destinations", { recursive: true });
await mkdir("public/brand/flags", { recursive: true });

async function save(url, file) {
  if (existsSync(file)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

for (const card of cards) {
  const code = card.image?.match(/\/([A-Z]{2})\.avif/)?.[1];
  if (!code) {
    console.log("skip", card.name);
    continue;
  }
  const lower = code.toLowerCase();
  const tasks = [
    save(`https://media.atlys.com/f_webp,w_600,q_75/b2c/Home%20page/country-bg-gradient/${code}.avif`, `public/brand/destinations/${lower}.webp`),
    save(`https://media.atlys.com/f_webp,w_1600,q_60/b2c/Home%20page/country-bg-gradient/${code}.avif`, `public/brand/destinations/${lower}-wide.webp`),
    save(`https://media.atlys.com/f_auto,w_100/b2c/Home%20page/flags/${code}.png?q=50`, `public/brand/flags/${lower}.png`),
  ];
  const results = await Promise.allSettled(tasks);
  results.forEach((r) => r.status === "rejected" && console.log("fail", code, r.reason.message));
  console.log("ok", code);
}
await save("https://media.atlys.com/image/upload/country_flags/eg.svg", "public/brand/flags/eg.svg").catch((e) => console.log(e.message));
