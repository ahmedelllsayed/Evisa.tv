import "server-only";
import { getAirport } from "./airports";
import { findHoldableFlight, type HoldableFlight } from "./duffel";
import { findRefundableHotel, type HoldableHotel } from "./liteapi";
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
    insurance: extras.reservationInsuranceFee,
  };
}

export function openServices(extras: SiteExtras): ReservationServices {
  return {
    flight: extras.reservationFlightOn,
    hotel: extras.reservationHotelOn,
    itinerary: extras.reservationItineraryOn,
    insurance: extras.reservationInsuranceOn,
  };
}

export async function createReservationQuote(raw: unknown) {
  const parsed = reservationInput.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const input = parsed.data;
  const settings = await getSiteSettings();
  const open = openServices(settings.extras);
  const blocked = (Object.keys(open) as (keyof ReservationServices)[]).find((key) => input.services[key] && !open[key]);
  if (blocked) return { ok: false as const, error: "One of the selected services is not available." };
  const amount = reservationTotal(input.services, reservationFees(settings.extras));
  if (amount <= 0) return { ok: false as const, error: "Choose a service with a price." };
  const keys = reservationKeys();
  if (input.services.flight && !keys.duffel) return { ok: false as const, error: "Flight holds are not available." };
  if (input.services.hotel && !keys.liteapi) return { ok: false as const, error: "Hotel booking is not available." };
  if (input.services.itinerary && !keys.gemini) return { ok: false as const, error: "The itinerary service is not available." };
  try {
    const quote: { flight?: HoldableFlight; hotel?: HoldableHotel } = {};
    if (input.services.flight) quote.flight = await findHoldableFlight(input);
    if (input.services.hotel) quote.hotel = await findRefundableHotel(input);
    const order = await insertTravelOrder(input, quote, amount, reservationFees(settings.extras));
    if (!order) return { ok: false as const, error: "The request could not be saved." };
    const destination = input.toIata ? await getAirport(input.toIata) : null;
    return {
      ok: true as const,
      id: order.id,
      reference: order.reference,
      amount: order.amount,
      currency: order.currency,
      destination: destination ? `${destination.city}` : input.toIata,
      flight: quote.flight?.legs.map((leg) => `${leg.carrier} ${leg.flightNumber} ${leg.from}–${leg.to}`) ?? [],
      hotel: quote.hotel ? `${quote.hotel.name}, ${quote.hotel.checkIn} – ${quote.hotel.checkOut}` : "",
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "The reservation could not be checked." };
  }
}
