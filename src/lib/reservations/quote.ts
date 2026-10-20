import "server-only";
import { getAirport } from "./airports";
import { agodaCabin, searchAgodaFlight, searchAgodaHotel, type FlightSchedule, type HotelQuote } from "./agoda";
import { addIsoDays } from "./limits";
import { insertTravelOrder } from "./orders";
import { reservationTotal, type ReservationFees, type ReservationServices } from "./pricing";
import { reservationKeys } from "./keys";
import { reservationInput } from "./schema";
import type { SiteExtras } from "@/lib/data/settings";
import { getSiteSettings } from "@/lib/data/settings";

export function reservationFees(extras: SiteExtras): ReservationFees {
  return {
    flight: extras.reservationFlightFee,
    hotel: extras.reservationHotelFee,
    itinerary: extras.reservationItineraryFee,
    insurance: 0,
  };
}

export function openServices(extras: SiteExtras): ReservationServices {
  return {
    flight: extras.reservationFlightOn,
    hotel: extras.reservationHotelOn,
    itinerary: extras.reservationItineraryOn,
    insurance: false,
  };
}

export async function createReservationQuote(raw: unknown) {
  const parsed = reservationInput.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const input = { ...parsed.data, services: { ...parsed.data.services, insurance: false } };
  const settings = await getSiteSettings();
  const open = openServices(settings.extras);
  const blocked = (Object.keys(open) as (keyof ReservationServices)[]).find((key) => input.services[key] && !open[key]);
  if (blocked) return { ok: false as const, error: "One of the selected services is not available." };
  const amount = reservationTotal(input.services, reservationFees(settings.extras));
  if (amount <= 0) return { ok: false as const, error: "Choose a service with a price." };
  const keys = reservationKeys();
  if ((input.services.flight || input.services.hotel) && !keys.rapidapi) return { ok: false as const, error: "Flight and hotel search is not available." };
  if (input.services.itinerary && !keys.gemini) return { ok: false as const, error: "The itinerary service is not available." };
  try {
    const destination = input.toIata ? await getAirport(input.toIata) : null;
    const origin = input.fromIata ? await getAirport(input.fromIata) : null;
    if ((input.services.flight || input.services.hotel || input.services.itinerary) && !destination) {
      return { ok: false as const, error: "Destination and travel dates are required" };
    }
    const quote: { flight?: FlightSchedule & { return?: FlightSchedule }; hotel?: HotelQuote } = {};
    const checkOut = input.returnDate || addIsoDays(input.departDate, 5);
    if (input.services.flight) {
      if (!origin) return { ok: false as const, error: "Choose the departure airport" };
      const cabin = agodaCabin(input.cabin);
      const outbound = await searchAgodaFlight(origin, destination!, input.departDate, input.adults, cabin);
      const inbound = input.tripType === "roundtrip" && input.returnDate
        ? await searchAgodaFlight(destination!, origin, input.returnDate, input.adults, cabin)
        : undefined;
      quote.flight = { ...outbound, legs: [...outbound.legs, ...(inbound?.legs ?? [])], return: inbound };
    }
    if (input.services.hotel && destination) {
      quote.hotel = await searchAgodaHotel(destination.city, destination.country, input.departDate, checkOut, input.adults);
    }
    const order = await insertTravelOrder(input, quote, amount, reservationFees(settings.extras));
    if (!order) return { ok: false as const, error: "The request could not be saved." };
    return {
      ok: true as const,
      id: order.id,
      reference: order.reference,
      amount: order.amount,
      currency: order.currency,
      destination: destination ? destination.city : input.toIata,
      flight: quote.flight?.legs.map((leg) => `${leg.carrier} ${leg.flightNumber} ${leg.from}–${leg.to}`) ?? [],
      hotel: quote.hotel ? `${quote.hotel.name}, ${quote.hotel.checkIn} – ${quote.hotel.checkOut}` : "",
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "The reservation could not be checked." };
  }
}
