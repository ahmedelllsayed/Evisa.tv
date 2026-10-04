// Database access shared by the Next.js app and the `npm run db:*` scripts.
// Uses Postgres (Supabase) when DATABASE_URL is set, otherwise an embedded
// Postgres (PGlite) persisted under `.data/pglite` for local development.
import { readFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import destinationsSeed from "../../data/seed/destinations.json" with { type: "json" };
import * as content from "../../data/seed/content.ts";
import { officialSources } from "../../data/official-sources.ts";

export type Row = Record<string, unknown>;

export interface Db {
  kind: "postgres" | "pglite";
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Pick<Db, "query">) => Promise<T>): Promise<T>;
}

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__db ??= createDb().catch((err) => {
    globalForDb.__db = undefined;
    throw err;
  });
  return globalForDb.__db;
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
    const wrap = (client: typeof sql): Pick<Db, "query"> => ({
      async query<T>(text: string, params: unknown[] = []) {
        return (await client.unsafe(text, params as never[])) as unknown as T[];
      },
    });
    const db: Db = {
      kind: "postgres",
      ...wrap(sql),
      async exec(text) {
        await sql.unsafe(text);
      },
      async transaction(fn) {
        return (await sql.begin((tx) => fn(wrap(tx as unknown as typeof sql)))) as never;
      },
    };
    const reserved = await sql.reserve();
    const locked: Db = {
      kind: "postgres",
      ...wrap(reserved),
      async exec(text) {
        await reserved.unsafe(text);
      },
      async transaction(fn) {
        return (await reserved.begin((tx) => fn(wrap(tx as unknown as typeof sql)))) as never;
      },
    };
    try {
      await reserved.unsafe("select pg_advisory_lock(84217001)");
      await migrate(locked, console.log);
      await seed(locked, { log: console.log });
    } finally {
      await reserved.unsafe("select pg_advisory_unlock(84217001)").catch(() => undefined);
      reserved.release();
    }
    return db;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production. PGlite is only for local development.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.LOCAL_DB_DIR || path.join(process.cwd(), ".data", "pglite");
  await mkdir(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  const db: Db = {
    kind: "pglite",
    async query<T>(text: string, params: unknown[] = []) {
      return (await pg.query<T>(text, params)).rows;
    },
    async exec(text) {
      await pg.exec(text);
    },
    async transaction(fn) {
      return pg.transaction(async (tx) =>
        fn({ query: async <T>(text: string, params: unknown[] = []) => (await tx.query<T>(text, params)).rows }),
      );
    },
  };
  await migrate(db);
  await seed(db);
  return db;
}

export async function migrate(db: Db, log: (m: string) => void = () => {}) {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const supabaseOnly = file.includes("supabase");
    if (supabaseOnly && db.kind === "pglite") continue;
    if (supabaseOnly) {
      const [{ exists }] = await db.query<{ exists: boolean }>(
        "select exists (select 1 from information_schema.schemata where schema_name = 'auth') as exists",
      );
      if (!exists) {
        log(`skip ${file} (no Supabase auth schema)`);
        continue;
      }
    }
    await db.exec(await readFile(path.join(dir, file), "utf8"));
    log(`applied ${file}`);
  }
}

type SeedDestination = (typeof destinationsSeed)[number];

export async function seed(db: Db, { force = false, log = (_: string) => {} } = {}) {
  const [{ count }] = await db.query<{ count: number }>("select count(*)::int as count from destinations");
  if (count > 0 && !force) return;

  await db.transaction(async (tx) => {
    const ids = new Map<string, string>();
    for (const d of destinationsSeed as SeedDestination[]) {
      const [row] = await tx.query<{ id: string }>(
        `insert into destinations (code, slug, name, region, visa_required, visa_type, validity, stay, entry, accepted_at, method,
           gov_fee, service_fee, currency, processing_hours, express_hours, express_fee, documents, image, hero_image, flag,
           lat, lng, cities, rejection_reasons, sources, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'EGP',$14,$15,$16,$17::jsonb,$18,$19,$20,$21,$22,$23::jsonb,$24::jsonb,$25::jsonb,$26)
         on conflict (code) do update set slug = excluded.slug, name = excluded.name, updated_at = now()
         returning id`,
        [
          d.code, d.slug, d.name, d.region, d.visaRequired, d.visaType, d.validity, d.stay, d.entry, d.acceptedAt, d.method,
          d.govFee, d.serviceFee, d.processingHours, d.expressHours, d.expressFee, JSON.stringify(d.documents), d.image,
          d.heroImage, d.flag, d.lat, d.lng, JSON.stringify(d.cities),
          JSON.stringify(d.visaRequired ? content.defaultRejectionReasons : []),
          JSON.stringify(sourcesFor(d.code, d.name)),
          d.sortOrder,
        ],
      );
      ids.set(d.code, row.id);
    }

    await tx.query("delete from faqs where destination_id is null");
    for (const [i, f] of content.faqs.entries()) {
      await tx.query("insert into faqs (scope, category, question, answer, sort_order) values ($1,$2,$3,$4,$5)", [
        f.scope, f.category, f.question, f.answer, i,
      ]);
    }

    await tx.query("delete from reviews where destination_id is null");
    for (const [i, r] of content.reviews.entries()) {
      await tx.query(
        "insert into reviews (scope, author, location, title, body, rating, product, published_at, sort_order) values ($1,$2,$3,$4,$5,$6,$7,coalesce($8::date, current_date),$9)",
        [r.scope, r.author, r.location ?? null, r.title ?? null, r.body, r.rating ?? 5, r.product ?? null, r.publishedAt ?? null, i],
      );
    }

    await tx.query("delete from events");
    for (const [i, e] of content.events.entries()) {
      const d = (destinationsSeed as SeedDestination[]).find((x) => x.code === e.country);
      await tx.query(
        "insert into events (destination_id, name, city, country_code, starts_on, image, sort_order) values ($1,$2,$3,$4,$5::date,$6,$7)",
        [ids.get(e.country) ?? null, e.name, e.city, e.country, e.startsOn, d?.image ?? null, i],
      );
    }

    for (const h of content.holidays) {
      await tx.query(
        "insert into holidays (country_code, date, name) values ($1,$2::date,$3) on conflict (country_code, date) do update set name = excluded.name",
        [h.country, h.date, h.name],
      );
    }

    const [{ n }] = await tx.query<{ n: number }>("select count(*)::int as n from fee_changes");
    if (n === 0) {
      const sample = (destinationsSeed as SeedDestination[]).filter((d) => d.visaRequired).slice(0, 12);
      for (const [i, d] of sample.entries()) {
        const total = d.govFee + d.serviceFee;
        const old = Math.round(total * (i % 3 === 0 ? 1.06 : 0.95));
        await tx.query(
          "insert into fee_changes (destination_id, old_total, new_total, reason, changed_at) values ($1,$2,$3,$4, now() - ($5 || ' days')::interval)",
          [ids.get(d.code), old, total, old > total ? "Government fee reduced" : "Exchange rate update", String(3 + i * 6)],
        );
      }
    }
  });
  log(`seeded ${destinationsSeed.length} destinations`);
}

function sourcesFor(code: string, name: string) {
  return officialSources[code] ?? [{ label: `Government of ${name}`, url: "" }];
}
