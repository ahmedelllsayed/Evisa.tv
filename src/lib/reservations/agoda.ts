import "server-only";
import type { Airport } from "./airports";
import { reservationKeys } from "./keys";

const AGODA_MCP = "https://mcp.rapidapi.com";
const AGODA_HOST = "agoda-com.p.rapidapi.com";

export type FlightLeg = {
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  carrier: string;
  flightNumber: string;
  cabin: string;
  aircraft: string;
};

export type FlightSchedule = { legs: FlightLeg[]; stopCount: number };

export type HotelQuote = {
  name: string;
  address: string;
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  room: string;
  stars: number;
  nightly: number;
  total: number;
  currency: string;
};

type Segment = {
  originAirport?: string;
  destinationAirport?: string;
  departDateTime?: string;
  arrivalDateTime?: string;
  duration?: number;
  flightNumber?: string;
  aircraftContent?: { aircraftName?: string; aircraftType?: string } | null;
  cabinClassContent?: { cabinName?: string } | null;
  carrierContent?: { carrierCode?: string; carrierName?: string } | null;
  operatingCarrierContent?: { carrierCode?: string; carrierName?: string } | null;
};

type FlightSearch = {
  data?: { bundles?: { outboundSlice?: { segments?: Segment[] } | null }[] } | null;
  message?: string;
  flyingSuggestion?: string[];
  flyingFromSuggestion?: string[];
  flyingToSuggestion?: string[];
};

const STOP_WORDS = new Set(["airport", "international", "intl", "the", "of", "and", "air", "base", "field", "terminal"]);
const canonicalNames = new Map<string, string>();
const resolvedNames = new Map<string, string>();

async function agoda(name: string, args: Record<string, unknown>, timeoutMs = 20_000) {
  const key = reservationKeys().rapidapi;
  if (!key) throw new Error("Flight and hotel search is not available.");
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(AGODA_MCP, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "x-api-host": AGODA_HOST,
          "x-api-key": key,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`RapidAPI search failed (${response.status})`);
      const line = text.includes("\ndata:") ? text.split(/\r?\n/).filter((item) => item.startsWith("data:")).pop()?.slice(5).trim() : text;
      const payload = JSON.parse(line || "null") as { result?: { content?: { text?: string }[] } } | null;
      const content = payload?.result?.content?.[0]?.text;
      if (!content) return null;
      try {
        return JSON.parse(content) as unknown;
      } catch {
        return content;
      }
    } catch (error) {
      last = error;
      if (attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 800 : 2500));
    }
  }
  throw last instanceof Error ? last : new Error("RapidAPI search is unavailable.");
}

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function countryName(code: string) {
  if (!code || code.length !== 2) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || "";
  } catch {
    return "";
  }
}

function nameCandidates(airport: Airport) {
  const country = countryName(airport.country);
  return [airport.name, `${airport.city} ${airport.name}`.trim(), country ? `${airport.city}, ${country}` : "", `${airport.city}, ${airport.country}`, airport.city]
    .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}

function pickSuggestion(suggestions: string[], airport: Airport) {
  const cityTokens = new Set(tokens(airport.city));
  const airportTokens = new Set(tokens(airport.name).filter((token) => !cityTokens.has(token)));
  let best = "";
  let score = 0;
  for (const suggestion of suggestions) {
    const parts = tokens(suggestion);
    const airportHits = parts.filter((token) => airportTokens.has(token)).length;
    const cityHits = parts.filter((token) => cityTokens.has(token)).length;
    if (!airportHits && !cityHits) continue;
    const next = airportHits * 10 + cityHits;
    if (next > score) {
      best = suggestion;
      score = next;
    }
  }
  return best;
}

async function canonicalAirportName(iata: string) {
  const cached = canonicalNames.get(iata);
  if (cached) return cached;
  const result = (await agoda("flightsauto-complete", { query: iata, language: "en-us" }).catch(() => null)) as {
    suggestions?: { airports?: { code?: string; name?: string }[]; nearByAirports?: { code?: string; name?: string }[] }[];
  } | null;
  for (const suggestion of result?.suggestions ?? []) {
    const match = [...(suggestion.airports ?? []), ...(suggestion.nearByAirports ?? [])].find((item) => item.code === iata && item.name);
    if (match?.name) {
      canonicalNames.set(iata, match.name);
      return match.name;
    }
  }
  return "";
}

function formatFlightNumber(code: string, raw?: string) {
  const number = (raw ?? "").trim();
  if (!number) return code || "—";
  return code && number.toUpperCase().startsWith(code.toUpperCase()) ? number : `${code}${number}`;
}

function extractLegs(result: FlightSearch | null, from: Airport, to: Airport, allowConnections: boolean) {
  for (const bundle of result?.data?.bundles ?? []) {
    const segments = bundle.outboundSlice?.segments ?? [];
    if (!segments.length || (!allowConnections && segments.length !== 1)) continue;
    const first = segments[0];
    const last = segments[segments.length - 1];
    if (first.originAirport !== from.iata || last.destinationAirport !== to.iata) continue;
    if (segments.some((segment) => !segment.originAirport || !segment.destinationAirport || !segment.departDateTime || !segment.arrivalDateTime)) continue;
    return segments;
  }
  return null;
}

export async function searchAgodaFlight(from: Airport, to: Airport, date: string, adults: number, cabin: string): Promise<FlightSchedule> {
  const [fromCanonical, toCanonical] = await Promise.all([canonicalAirportName(from.iata), canonicalAirportName(to.iata)]);
  const fromNames = [...new Set([fromCanonical, resolvedNames.get(from.iata) || "", ...nameCandidates(from)].filter(Boolean))];
  const toNames = [...new Set([toCanonical, resolvedNames.get(to.iata) || "", ...nameCandidates(to)].filter(Boolean))];
  let fromName = fromNames[0] || from.name;
  let toName = toNames[0] || to.name;
  const triedFrom = new Set<string>();
  const triedTo = new Set<string>();

  const search = async (directOnly: boolean) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      triedFrom.add(fromName);
      triedTo.add(toName);
      const result = (await agoda("flightsone-waysearch", {
        flying_from: fromName,
        flying_to: toName,
        departure_date: date,
        search_type: "Name",
        adults: Math.max(1, adults),
        direct_only: directOnly,
        class: cabin,
        sort_by: "BestOverall",
      }, 90_000)) as FlightSearch | null;
      const message = result?.message ?? "";
      const badFrom = /flying_from is not available/i.test(message);
      const badTo = /flying_to is not available/i.test(message);
      if (badFrom || badTo) {
        const suggestions = ((badFrom ? result?.flyingFromSuggestion : result?.flyingToSuggestion) ?? result?.flyingSuggestion ?? []).filter((item) => !(badFrom ? triedFrom : triedTo).has(item));
        const next = pickSuggestion(suggestions, badFrom ? from : to) || (badFrom ? fromNames : toNames).find((name) => !(badFrom ? triedFrom : triedTo).has(name));
        if (!next) throw new Error(`No published flight was found from ${from.iata} to ${to.iata}. Try another date or airport.`);
        if (badFrom) fromName = next;
        else toName = next;
        continue;
      }
      const segments = extractLegs(result, from, to, !directOnly);
      if (segments) {
        resolvedNames.set(from.iata, fromName);
        resolvedNames.set(to.iata, toName);
        return segments;
      }
      return null;
    }
    return null;
  };

  const segments = (await search(true)) || (await search(false));
  if (!segments?.length) throw new Error(`No published flight was found from ${from.iata} to ${to.iata}. Try another date.`);
  const legs = segments.map((segment) => {
    const carrier = segment.operatingCarrierContent ?? segment.carrierContent ?? {};
    const departAt = segment.departDateTime || "";
    const arriveAt = segment.arrivalDateTime || "";
    return {
      from: segment.originAirport || from.iata,
      to: segment.destinationAirport || to.iata,
      departAt,
      arriveAt,
      carrier: carrier.carrierName || carrier.carrierCode || "",
      flightNumber: formatFlightNumber(carrier.carrierCode || "", segment.flightNumber),
      cabin: segment.cabinClassContent?.cabinName || cabin,
      aircraft: segment.aircraftContent?.aircraftName || segment.aircraftContent?.aircraftType || "",
    };
  });
  return { legs, stopCount: Math.max(0, legs.length - 1) };
}

export async function searchAgodaHotel(city: string, country: string, checkIn: string, checkOut: string, adults: number): Promise<HotelQuote> {
  const full = countryName(country);
  const locations = [...new Set([full ? `${city}, ${full}` : "", `${city}, ${country}`, city].filter(Boolean))];
  let properties: Record<string, unknown>[] = [];
  for (const location of locations) {
    const result = (await agoda("hotels-homesovernight-stayssearch", {
      location,
      checkin_date: checkIn,
      checkout_date: checkOut,
      adults,
      rooms: 1,
      language_id: 1,
    }).catch(() => null)) as { data?: { properties?: Record<string, unknown>[] } } | null;
    const found = result?.data?.properties ?? [];
    if (found.length) {
      properties = found;
      break;
    }
  }
  const property = properties.find((item) => {
    const info = (item.content as { informationSummary?: { rating?: number } } | undefined)?.informationSummary;
    const available = (item.pricing as { isAvailable?: boolean } | undefined)?.isAvailable;
    return (info?.rating ?? 0) >= 3 && available;
  }) ?? properties[0];
  if (!property) throw new Error("No published hotel was found for these dates. Try another date.");
  const info = ((property.content as { informationSummary?: Record<string, unknown> } | undefined)?.informationSummary ?? {}) as {
    displayName?: string;
    defaultName?: string;
    rating?: number;
    address?: { area?: { name?: string }; city?: { name?: string }; country?: { name?: string } };
  };
  const room = ((((property.pricing as { offers?: { roomOffers?: { room?: { pricing?: { currency?: string; price?: { perRoomPerNight?: { inclusive?: { display?: number } }; perBook?: { inclusive?: { display?: number } } } }[] } }[] }[] } | undefined)?.offers?.[0]?.roomOffers?.[0]?.room) ?? {}) as {
    pricing?: { currency?: string; price?: { perRoomPerNight?: { inclusive?: { display?: number } }; perBook?: { inclusive?: { display?: number } } } }[];
  });
  const price = room.pricing?.[0];
  const name = info.displayName || info.defaultName || "";
  if (!name) throw new Error("No published hotel was found for these dates. Try another date.");
  const roomInfo = (property.enrichment as { roomInformation?: { cheapestRoomName?: string; facilities?: { propertyFacilityName?: string }[] } } | undefined)?.roomInformation;
  return {
    name,
    address: [info.address?.area?.name, info.address?.city?.name, info.address?.country?.name].filter(Boolean).join(", "),
    city: info.address?.city?.name || city,
    country: info.address?.country?.name || country,
    checkIn,
    checkOut,
    room: roomInfo?.cheapestRoomName || "",
    stars: Math.round(info.rating ?? 0),
    nightly: Math.round(price?.price?.perRoomPerNight?.inclusive?.display ?? 0),
    total: Math.round(price?.price?.perBook?.inclusive?.display ?? 0),
    currency: price?.currency || "USD",
  };
}

export function agodaCabin(cabin: "economy" | "premium_economy" | "business" | "first") {
  if (cabin === "premium_economy") return "Premium Economy";
  if (cabin === "business") return "Business";
  if (cabin === "first") return "First";
  return "Economy";
}
