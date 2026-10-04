import "server-only";
import { cache } from "react";
import type { Destination, Faq, FeeChange, Holiday, Review, TravelEvent, VisaType } from "@/lib/types";
import { day, iso, json, num, numOrNull, one, sql } from "./db";
import { clearDestinationMedia } from "@/lib/destination-media";

type Row = Record<string, unknown>;

function toDestination(r: Row): Destination {
  return {
    id: String(r.id),
    code: String(r.code).trim(),
    slug: String(r.slug),
    name: String(r.name),
    region: (r.region as string) ?? null,
    visaRequired: Boolean(r.visa_required),
    visaType: r.visa_type as VisaType,
    validity: (r.validity as string) ?? null,
    stay: (r.stay as string) ?? null,
    entry: (r.entry as string) ?? null,
    acceptedAt: (r.accepted_at as string) ?? null,
    method: (r.method as string) ?? null,
    govFee: num(r.gov_fee),
    serviceFee: num(r.service_fee),
    currency: String(r.currency).trim(),
    processingHours: numOrNull(r.processing_hours),
    expressHours: numOrNull(r.express_hours),
    expressFee: numOrNull(r.express_fee),
    documents: json<string[]>(r.documents, []),
    image: (r.image as string) ?? null,
    heroImage: (r.hero_image as string) ?? null,
    flag: (r.flag as string) ?? null,
    videoUrl: (r.video_url as string) ?? null,
    lat: numOrNull(r.lat),
    lng: numOrNull(r.lng),
    cities: json<string[]>(r.cities, []),
    sources: json(r.sources, []),
    rejectionReasons: json(r.rejection_reasons, []),
    sortOrder: num(r.sort_order),
    isActive: Boolean(r.is_active),
    updatedAt: iso(r.updated_at),
  };
}

export const listDestinations = cache(async (opts: { includeInactive?: boolean } = {}) => {
  const rows = await sql(
    `select * from destinations ${opts.includeInactive ? "" : "where is_active"} order by sort_order, name`,
  );
  return rows.map(toDestination);
});

export const getDestinationBySlug = cache(async (slug: string) => {
  const r = await one("select * from destinations where slug = $1", [slug]);
  return r ? toDestination(r) : null;
});

export async function getDestinationById(id: string) {
  const r = await one("select * from destinations where id = $1", [id]);
  return r ? toDestination(r) : null;
}

function toFaq(r: Row): Faq {
  return {
    id: String(r.id),
    destinationId: (r.destination_id as string) ?? null,
    scope: String(r.scope),
    category: String(r.category),
    question: String(r.question),
    answer: String(r.answer),
    sortOrder: num(r.sort_order),
  };
}

/** Global FAQs for a scope, plus destination-specific ones when `destinationId` is given. */
export async function listFaqs(scope: string, destinationId?: string) {
  const rows = await sql(
    `select * from faqs where scope = $1 and (destination_id is null ${destinationId ? "or destination_id = $2" : ""})
     order by destination_id nulls last, sort_order`,
    destinationId ? [scope, destinationId] : [scope],
  );
  return rows.map(toFaq);
}

export async function listAllFaqs() {
  return (await sql("select * from faqs order by scope, sort_order")).map(toFaq);
}

export async function searchHelp(query: string) {
  const term = `%${query.trim().toLowerCase()}%`;
  const [faqs, destinations] = await Promise.all([
    sql(
      `select question, answer from faqs
       where lower(question) like $1 or lower(answer) like $1
       order by sort_order limit 5`,
      [term],
    ),
    sql(
      `select name, slug from destinations
       where is_active and (lower(name) like $1 or lower(slug) like $1)
       order by sort_order limit 5`,
      [term],
    ),
  ]);
  return {
    faqs: faqs.map((row) => ({ question: String(row.question), answer: String(row.answer) })),
    destinations: destinations.map((row) => ({ name: String(row.name), slug: String(row.slug) })),
  };
}

function toReview(r: Row): Review {
  return {
    id: String(r.id),
    destinationId: (r.destination_id as string) ?? null,
    scope: String(r.scope),
    author: String(r.author),
    location: (r.location as string) ?? null,
    title: (r.title as string) ?? null,
    body: String(r.body),
    rating: num(r.rating),
    product: (r.product as string) ?? null,
    url: (r.url as string) ?? null,
    publishedAt: day(r.published_at) ?? "",
    sortOrder: num(r.sort_order),
  };
}

export async function listReviews(scope: string, destinationId?: string) {
  const rows = await sql(
    `select * from reviews where scope = $1 and (destination_id is null ${destinationId ? "or destination_id = $2" : ""})
     order by destination_id nulls last, sort_order`,
    destinationId ? [scope, destinationId] : [scope],
  );
  return rows.map(toReview);
}

export async function listAllReviews() {
  return (await sql("select * from reviews order by scope, sort_order")).map(toReview);
}

function toEvent(r: Row): TravelEvent {
  return {
    id: String(r.id),
    destinationId: (r.destination_id as string) ?? null,
    name: String(r.name),
    city: String(r.city),
    countryCode: String(r.country_code).trim(),
    startsOn: day(r.starts_on) ?? "",
    image: (r.image as string) ?? null,
  };
}

export async function listEvents(): Promise<TravelEvent[]> {
  const rows = await sql("select * from events where starts_on >= current_date order by starts_on");
  return rows.map(toEvent);
}

export async function listAllEvents(): Promise<TravelEvent[]> {
  return (await sql("select * from events order by starts_on desc, sort_order")).map(toEvent);
}

export type TravelEventInput = {
  id?: string;
  name: string;
  city: string;
  countryCode: string;
  startsOn: string;
  image: string | null;
};

export async function saveTravelEvent(input: TravelEventInput) {
  const name = input.name.trim();
  const city = input.city.trim();
  const code = input.countryCode.trim().toUpperCase();
  const startsOn = input.startsOn.trim();
  if (!name || !city) throw new Error("أدخل اسم الفعالية والمدينة.");
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("اختر دولة من القائمة.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) throw new Error("أدخل تاريخًا صالحًا.");
  const dest = await one<{ id: string; image: string | null }>("select id, image from destinations where code = $1", [code]);
  const image = input.image?.trim() || dest?.image || null;
  const params = [dest?.id ?? null, name, city, code, startsOn, image];
  if (input.id) {
    await sql(
      "update events set destination_id=$2, name=$3, city=$4, country_code=$5, starts_on=$6::date, image=$7 where id=$1",
      [input.id, ...params],
    );
    return;
  }
  await sql(
    "insert into events (destination_id, name, city, country_code, starts_on, image, sort_order) values ($1,$2,$3,$4,$5::date,$6,(select coalesce(max(sort_order),0)+1 from events))",
    params,
  );
}

export async function deleteTravelEvent(id: string) {
  await sql("delete from events where id = $1", [id]);
}

export async function listHolidays(countryCode: string): Promise<Holiday[]> {
  const rows = await sql("select * from holidays where country_code = $1 and date >= current_date - 31 order by date", [
    countryCode,
  ]);
  return rows.map(toHoliday);
}

export async function listAllHolidays(): Promise<Holiday[]> {
  return (await sql("select * from holidays order by date desc")).map(toHoliday);
}

export async function saveHoliday(input: { id?: string; countryCode: string; date: string; name: string }) {
  const name = input.name.trim();
  const code = input.countryCode.trim().toUpperCase();
  const date = input.date.trim();
  if (!name) throw new Error("أدخل اسم العطلة.");
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("رمز الدولة يجب أن يكون حرفين.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("أدخل تاريخًا صالحًا.");
  try {
    if (input.id) {
      await sql("update holidays set country_code=$2, date=$3::date, name=$4 where id=$1", [input.id, code, date, name]);
      return;
    }
    await sql("insert into holidays (country_code, date, name) values ($1,$2::date,$3)", [code, date, name]);
  } catch (error) {
    const codeValue = (error as { code?: string }).code;
    if (codeValue === "23505" || String(error).includes("duplicate") || String(error).includes("unique")) {
      throw new Error("هذه الدولة لديها عطلة في التاريخ نفسه.");
    }
    throw error;
  }
}

export async function deleteHoliday(id: string) {
  await sql("delete from holidays where id = $1", [id]);
}

function toHoliday(r: Row): Holiday {
  return { id: String(r.id), date: day(r.date) ?? "", name: String(r.name), countryCode: String(r.country_code).trim() };
}

export async function listFeeChanges(): Promise<FeeChange[]> {
  const rows = await sql(
    `select f.*, d.name as destination_name from fee_changes f join destinations d on d.id = f.destination_id
     order by f.changed_at desc`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    destinationId: String(r.destination_id),
    destinationName: String(r.destination_name),
    oldTotal: num(r.old_total),
    newTotal: num(r.new_total),
    reason: (r.reason as string) ?? null,
    changedAt: iso(r.changed_at),
  }));
}

// ----- Admin mutations -----

export type DestinationInput = {
  name: string;
  slug: string;
  code: string;
  region: string | null;
  visaRequired: boolean;
  visaType: VisaType;
  validity: string | null;
  stay: string | null;
  entry: string | null;
  acceptedAt: string | null;
  method: string | null;
  govFee: number;
  serviceFee: number;
  processingHours: number | null;
  expressHours: number | null;
  expressFee: number | null;
  documents: string[];
  image: string | null;
  heroImage: string | null;
  flag: string | null;
  videoUrl: string | null;
  cities: string[];
  rejectionReasons: { title: string; body: string }[];
  sources: { label: string; url: string }[];
  sortOrder: number;
  isActive: boolean;
};

export async function updateDestination(id: string, input: DestinationInput) {
  const before = await getDestinationById(id);
  await sql(
    `update destinations set name=$2, slug=$3, code=$4, region=$5, visa_required=$6, visa_type=$7, validity=$8, stay=$9,
       entry=$10, accepted_at=$11, method=$12, gov_fee=$13, service_fee=$14, processing_hours=$15, express_hours=$16,
       express_fee=$17, documents=$18::jsonb, image=$19, hero_image=$20, flag=$21, cities=$22::jsonb,
       rejection_reasons=$23::jsonb, sources=$24::jsonb, sort_order=$25, is_active=$26, video_url=$27, updated_at=now()
     where id=$1`,
    [
      id, input.name, input.slug, input.code, input.region, input.visaRequired, input.visaType, input.validity, input.stay,
      input.entry, input.acceptedAt, input.method, input.govFee, input.serviceFee, input.processingHours, input.expressHours,
      input.expressFee, JSON.stringify(input.documents), input.image, input.heroImage, input.flag,
      JSON.stringify(input.cities), JSON.stringify(input.rejectionReasons), JSON.stringify(input.sources), input.sortOrder, input.isActive,
      input.videoUrl,
    ],
  );
  const newTotal = input.govFee + input.serviceFee;
  if (before && before.govFee + before.serviceFee !== newTotal) {
    await sql("insert into fee_changes (destination_id, old_total, new_total, reason) values ($1,$2,$3,$4)", [
      id, before.govFee + before.serviceFee, newTotal, "Fee updated",
    ]);
  }
}

export async function createDestination(input: DestinationInput) {
  const r = await one<{ id: string }>(
    `insert into destinations (name, slug, code, currency) values ($1, $2, $3, 'EGP') returning id`,
    [input.name, input.slug, input.code],
  );
  await updateDestination(r!.id, input);
  return r!.id;
}

export async function deleteDestination(id: string) {
  const row = await one<{ count: number }>("select count(*)::int as count from applications where destination_id = $1", [id]);
  if ((row?.count ?? 0) > 0) {
    return { ok: false as const, error: "لا يمكن حذف وجهة لها طلبات. أخفها من الموقع بدلاً من ذلك." };
  }
  await sql("delete from destinations where id = $1", [id]);
  await clearDestinationMedia(id);
  return { ok: true as const };
}

export async function upsertFaq(input: { id?: string; scope: string; category: string; question: string; answer: string; destinationId: string | null; sortOrder: number }) {
  if (input.id) {
    await sql("update faqs set scope=$2, category=$3, question=$4, answer=$5, destination_id=$6, sort_order=$7 where id=$1", [
      input.id, input.scope, input.category, input.question, input.answer, input.destinationId, input.sortOrder,
    ]);
  } else {
    await sql("insert into faqs (scope, category, question, answer, destination_id, sort_order) values ($1,$2,$3,$4,$5,$6)", [
      input.scope, input.category, input.question, input.answer, input.destinationId, input.sortOrder,
    ]);
  }
}

export async function deleteFaq(id: string) {
  await sql("delete from faqs where id = $1", [id]);
}

export async function upsertReview(input: { id?: string; scope: string; author: string; location: string | null; title: string | null; body: string; rating: number; product: string | null; destinationId: string | null }) {
  if (input.id) {
    await sql("update reviews set scope=$2, author=$3, location=$4, title=$5, body=$6, rating=$7, product=$8, destination_id=$9 where id=$1", [
      input.id, input.scope, input.author, input.location, input.title, input.body, input.rating, input.product, input.destinationId,
    ]);
  } else {
    await sql("insert into reviews (scope, author, location, title, body, rating, product, destination_id) values ($1,$2,$3,$4,$5,$6,$7,$8)", [
      input.scope, input.author, input.location, input.title, input.body, input.rating, input.product, input.destinationId,
    ]);
  }
}

export async function deleteReview(id: string) {
  await sql("delete from reviews where id = $1", [id]);
}
