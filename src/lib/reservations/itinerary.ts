import "server-only";
import { addIsoDays, nightsBetween } from "./limits";
import { reservationKeys } from "./keys";
import type { ReservationInput } from "./schema";

export type ItineraryDay = {
  day: number;
  date: string;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
};

export type Itinerary = { destination: string; overview: string; days: ItineraryDay[] };

export async function buildItinerary(input: ReservationInput, place: string, hotelName?: string) {
  const key = reservationKeys().gemini;
  if (!key) throw new Error("The itinerary service is not available.");
  const checkOut = input.returnDate || addIsoDays(input.departDate, 5);
  const days = Math.max(1, Math.min(21, nightsBetween(input.departDate, checkOut) + 1));
  const hotelContext = hotelName
    ? `A published hotel in the search is "${hotelName}". Use its area as the base. Do not say a reservation is confirmed.`
    : `Use central ${place} as the base.`;
  const prompt = `Write a simple first-person travel itinerary for a visa file. Destination: ${place}. Arrival ${input.departDate}, departure ${checkOut}. ${days} days.
${hotelContext}
Rules: English only. One short sentence each for morning, afternoon and evening. At most two real places a day. No invented places. No flight numbers, prices, confirmation numbers, or booking references. Day 1 mentions arrival. The last day mentions departure.
JSON shape: {"destination": string, "overview": string, "days": [{"day": number, "date": "YYYY-MM-DD", "title": string, "morning": string, "afternoon": string, "evening": string}]}
Produce exactly ${days} days starting ${input.departDate}.`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!response.ok) throw new Error("The itinerary could not be written.");
  const json = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsed = JSON.parse(text.replace(/^```json/i, "").replace(/```$/, "").trim()) as Itinerary;
  if (!parsed.days?.length) throw new Error("The itinerary could not be written.");
  return parsed;
}
