import destinationsSeed from "../src/data/seed/destinations.json" with { type: "json" };
import { officialSources } from "../src/data/official-sources.ts";
import { getDb } from "../src/lib/db/core.ts";

const codes = destinationsSeed.map((destination) => destination.code);
const missing = codes.filter((code) => !officialSources[code]);
if (missing.length) {
  console.error("MISSING", missing.join(","));
  process.exit(1);
}

const db = await getDb();
for (const destination of destinationsSeed) {
  const sources = officialSources[destination.code];
  await db.query("update destinations set sources = $2::jsonb where code = $1", [destination.code, JSON.stringify(sources)]);
}
const [{ n }] = await db.query<{ n: number }>(
  "select count(*)::int as n from destinations where exists (select 1 from jsonb_array_elements(sources) s where s->>'url' like 'http%')",
);
console.log("UPDATED", codes.length, "WITH_URLS", n);
process.exit(0);
