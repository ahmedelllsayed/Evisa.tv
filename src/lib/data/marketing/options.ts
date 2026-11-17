import "server-only";
import { countryName } from "@/lib/countries";
import { listDestinations } from "../catalog";
import { sql } from "../db";
import { listContactLists } from "./library";

async function nationalities() {
  const rows = await sql<{ code: string }>(
    `select distinct upper(code) as code from (
       select nationality as code from profiles where nullif(trim(nationality), '') is not null
       union select nationality from travelers where nullif(trim(nationality), '') is not null
     ) codes where code ~ '^[A-Za-z]{2}$' order by 1`,
  );
  return rows.map((row) => ({ code: row.code, name: countryName(row.code, "ar") }));
}

/** Choices for the audience editor. */
export async function audienceOptions() {
  const [lists, destinations, countries] = await Promise.all([listContactLists(), listDestinations({ includeInactive: true }), nationalities()]);
  return {
    lists: lists.map((list) => ({ id: list.id, name: list.name, contacts: list.contacts })),
    destinations: destinations.map((destination) => ({ id: destination.id, name: destination.nameAr || destination.name })),
    nationalities: countries,
  };
}
