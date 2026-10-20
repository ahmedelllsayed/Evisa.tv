import "server-only";

export type Airport = { iata: string; name: string; city: string; country: string };

type Row = [string, string, string, string, number?, number?];

let rowsPromise: Promise<Row[]> | null = null;

function loadRows() {
  rowsPromise ??= import("@/data/airports.json").then((mod) => (mod.default ?? mod) as unknown as Row[]);
  return rowsPromise;
}

function toAirport(row: Row): Airport {
  return { iata: row[0], name: row[1], city: row[2], country: row[3] };
}

export async function getAirport(iata: string) {
  const rows = await loadRows();
  const row = rows.find((item) => item[0] === iata.toUpperCase());
  return row ? toAirport(row) : null;
}

export async function searchAirports(query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const rows = await loadRows();
  const exact: Airport[] = [];
  const starts: Airport[] = [];
  const contains: Airport[] = [];
  for (const row of rows) {
    const airport = toAirport(row);
    const iata = airport.iata.toLowerCase();
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();
    if (iata === q) exact.push(airport);
    else if (iata.startsWith(q) || city.startsWith(q)) starts.push(airport);
    else if (city.includes(q) || name.includes(q)) contains.push(airport);
    if (exact.length + starts.length >= limit) break;
  }
  return [...exact, ...starts, ...contains].slice(0, limit);
}
