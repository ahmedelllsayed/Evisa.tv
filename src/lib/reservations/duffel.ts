import "server-only";
import type { ReservationInput } from "./schema";
import { e164, reservationKeys } from "./keys";

export type FlightLeg = {
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  carrier: string;
  carrierCode: string;
  flightNumber: string;
  cabin: string;
};

export type HoldableFlight = {
  offerId: string;
  passengerIds: string[];
  expiresAt: string | null;
  currency: string;
  total: string;
  legs: FlightLeg[];
};

type Segment = {
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  departing_at?: string;
  arriving_at?: string;
  marketing_carrier?: { iata_code?: string; name?: string };
  operating_carrier?: { iata_code?: string; name?: string };
  marketing_carrier_flight_number?: string;
  operating_carrier_flight_number?: string;
  passengers?: { cabin_class_marketing_name?: string }[];
};

type Offer = {
  id?: string;
  expires_at?: string;
  total_amount?: string;
  total_currency?: string;
  payment_requirements?: { requires_instant_payment?: boolean; payment_required_by?: string | null };
  slices?: { segments?: Segment[] }[];
};

function headers(token: string) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    "Duffel-Version": "v2",
  };
}

async function duffel<T>(path: string, body: unknown): Promise<T> {
  const token = reservationKeys().duffel;
  if (!token) throw new Error("Flight holds are not available.");
  const response = await fetch(`https://api.duffel.com${path}`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload) throw new Error("No holdable flight was found for these dates.");
  return payload;
}

function leg(segment: Segment): FlightLeg | null {
  const from = segment.origin?.iata_code;
  const to = segment.destination?.iata_code;
  const carrier = segment.operating_carrier?.name || segment.marketing_carrier?.name;
  const code = segment.operating_carrier?.iata_code || segment.marketing_carrier?.iata_code;
  const number = segment.operating_carrier_flight_number || segment.marketing_carrier_flight_number;
  if (!from || !to || !carrier || !code || !number || !segment.departing_at || !segment.arriving_at) return null;
  return {
    from,
    to,
    departAt: segment.departing_at,
    arriveAt: segment.arriving_at,
    carrier,
    carrierCode: code,
    flightNumber: `${code}${number}`,
    cabin: segment.passengers?.[0]?.cabin_class_marketing_name || "Economy",
  };
}

export async function findHoldableFlight(input: ReservationInput): Promise<HoldableFlight> {
  const slices = [
    { origin: input.fromIata, destination: input.toIata, departure_date: input.departDate },
    ...(input.tripType === "roundtrip" && input.returnDate
      ? [{ origin: input.toIata, destination: input.fromIata, departure_date: input.returnDate }]
      : []),
  ];
  const json = await duffel<{
    data?: { live_mode?: boolean; passengers?: { id: string }[]; offers?: Offer[] };
  }>("/air/offer_requests?return_offers=true", {
    data: {
      slices,
      passengers: Array.from({ length: input.adults }, () => ({ type: "adult" })),
      cabin_class: input.cabin,
      max_connections: 1,
    },
  });
  if (process.env.NODE_ENV === "production" && json.data?.live_mode === false) {
    throw new Error("Flight holds are not available.");
  }
  const passengerIds = (json.data?.passengers ?? []).map((item) => item.id).filter(Boolean);
  const offer = (json.data?.offers ?? []).find((item) => item.id && item.payment_requirements?.requires_instant_payment === false);
  if (!offer?.id || passengerIds.length !== input.adults) throw new Error("No airline can hold this route without immediate payment.");
  const legs = (offer.slices ?? []).flatMap((slice) => slice.segments ?? []).map(leg).filter((item): item is FlightLeg => Boolean(item));
  if (!legs.length) throw new Error("No airline can hold this route without immediate payment.");
  return {
    offerId: offer.id,
    passengerIds,
    expiresAt: offer.expires_at || offer.payment_requirements?.payment_required_by || null,
    currency: offer.total_currency || "",
    total: offer.total_amount || "",
    legs,
  };
}

export async function createFlightHold(input: ReservationInput, flight: HoldableFlight) {
  const people = [
    {
      title: input.title,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      bornOn: input.bornOn,
    },
    ...input.companions,
  ];
  const json = await duffel<{
    data?: { id?: string; booking_reference?: string; payment_status?: { payment_required_by?: string | null } };
  }>("/air/orders", {
    data: {
      type: "hold",
      selected_offers: [flight.offerId],
      passengers: people.map((person, index) => ({
        id: flight.passengerIds[index],
        title: person.title,
        given_name: person.firstName,
        family_name: person.lastName,
        gender: person.gender,
        born_on: person.bornOn,
        email: input.email,
        phone_number: e164(input.phone),
        ...(index === 0
          ? {
              identity_documents: [
                {
                  type: "passport",
                  unique_identifier: input.passportNo,
                  issuing_country_code: input.nationality.toUpperCase(),
                },
              ],
            }
          : {}),
      })),
    },
  });
  const booking = json.data;
  if (!booking?.id || !booking.booking_reference) throw new Error("The airline did not confirm the hold.");
  return {
    orderId: booking.id,
    pnr: booking.booking_reference,
    holdUntil: booking.payment_status?.payment_required_by || null,
  };
}

export async function cancelFlightHold(orderId: string) {
  const created = await duffel<{ data?: { id?: string } }>("/air/order_cancellations", { data: { order_id: orderId } });
  if (!created.data?.id) throw new Error("The airline hold could not be cancelled.");
  await duffel(`/air/order_cancellations/${created.data.id}/actions/confirm`, { data: {} });
}
