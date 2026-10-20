import "server-only";
import { reservationKeys } from "./keys";
import type { ReservationInput } from "./schema";

export type HoldableHotel = {
  offerId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  room: string;
  cancelUntil: string | null;
  currency: string;
  total: number;
};

type Rate = {
  offerId?: string;
  rateId?: string;
  name?: string;
  retailRate?: { total?: { amount?: number; currency?: string } | { amount?: number; currency?: string }[] };
  cancellationPolicies?: { refundableTag?: string; cancelPolicyInfos?: { cancelTime?: string }[] };
};

function headers(key: string) {
  return { "X-API-Key": key, accept: "application/json", "content-type": "application/json" };
}

function money(rate: Rate) {
  const value = rate.retailRate?.total;
  const first = Array.isArray(value) ? value[0] : value;
  const amount = Number(first?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: first?.currency || "USD" };
}

function refundable(rate: Rate) {
  if (rate.cancellationPolicies?.refundableTag !== "RFN") return null;
  return rate.cancellationPolicies.cancelPolicyInfos?.find((item) => item.cancelTime)?.cancelTime || null;
}

export async function findRefundableHotel(input: ReservationInput): Promise<HoldableHotel> {
  const key = reservationKeys().liteapi;
  if (!key) throw new Error("Hotel holds are not available.");
  const checkIn = input.departDate;
  const checkOut = input.returnDate;
  if (!checkOut) throw new Error("A hotel hold needs a check-out date.");
  const listed = await fetch(`https://api.liteapi.travel/v3.0/data/hotels?${new URLSearchParams({ iataCode: input.toIata, limit: "12" })}`, {
    headers: headers(key),
    signal: AbortSignal.timeout(25_000),
  });
  const hotels = ((await listed.json().catch(() => null)) as { data?: { id?: string; name?: string; address?: string; city?: string; country?: string }[] } | null)?.data ?? [];
  const ids = hotels.map((hotel) => hotel.id).filter((id): id is string => Boolean(id)).slice(0, 8);
  if (!ids.length) throw new Error("No refundable hotel was found for these dates.");
  const rates = await fetch("https://api.liteapi.travel/v3.0/hotels/rates", {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({
      hotelIds: ids,
      occupancies: [{ adults: input.adults }],
      currency: "USD",
      guestNationality: input.nationality.toUpperCase(),
      checkin: checkIn,
      checkout: checkOut,
    }),
    signal: AbortSignal.timeout(40_000),
  });
  const rows = ((await rates.json().catch(() => null)) as { data?: { hotelId?: string; roomTypes?: { rates?: Rate[] }[] }[] } | null)?.data ?? [];
  let best: HoldableHotel | null = null;
  for (const row of rows) {
    const hotel = hotels.find((item) => item.id === row.hotelId);
    if (!hotel?.name) continue;
    for (const room of row.roomTypes ?? []) {
      for (const rate of room.rates ?? []) {
        const offerId = rate.offerId || rate.rateId;
        const price = money(rate);
        const cancelUntil = refundable(rate);
        if (!offerId || !price || cancelUntil === null && rate.cancellationPolicies?.refundableTag !== "RFN") continue;
        if (rate.cancellationPolicies?.refundableTag !== "RFN") continue;
        if (best && price.amount >= best.total) continue;
        best = {
          offerId,
          name: hotel.name,
          address: hotel.address || hotel.city || input.toIata,
          city: hotel.city || input.toIata,
          country: hotel.country || "",
          checkIn,
          checkOut,
          room: rate.name || "Room",
          cancelUntil,
          currency: price.currency,
          total: Math.round(price.amount),
        };
      }
    }
  }
  if (!best) throw new Error("No hotel with free cancellation was found for these dates.");
  return best;
}

export async function bookRefundableHotel(input: ReservationInput, hotel: HoldableHotel) {
  const key = reservationKeys().liteapi;
  if (!key) throw new Error("Hotel holds are not available.");
  const prebook = await fetch("https://api.liteapi.travel/v3.0/rates/prebook", {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({ offerId: hotel.offerId }),
    signal: AbortSignal.timeout(40_000),
  });
  const prebookBody = (await prebook.json().catch(() => null)) as { data?: { prebookId?: string } } | null;
  const prebookId = prebookBody?.data?.prebookId;
  if (!prebook.ok || !prebookId) throw new Error("The hotel rate expired before it could be held.");
  const guests = [
    { firstName: input.firstName, lastName: input.lastName },
    ...input.companions.map((person) => ({ firstName: person.firstName, lastName: person.lastName })),
  ];
  const bookBody = {
    prebookId,
    holder: { firstName: input.firstName, lastName: input.lastName, email: input.email },
    guests: guests.map((guest) => ({ occupancyNumber: 1, remarks: "", firstName: guest.firstName, lastName: guest.lastName, email: input.email })),
  };
  let booked: { data?: { bookingId?: string; hotelConfirmationCode?: string } } | null = null;
  for (const method of ["CREDIT", "WALLET"]) {
    const response = await fetch("https://api.liteapi.travel/v3.0/rates/book", {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({ ...bookBody, payment: { method } }),
      signal: AbortSignal.timeout(45_000),
    });
    const body = (await response.json().catch(() => null)) as { data?: { bookingId?: string; hotelConfirmationCode?: string } } | null;
    if (response.ok && body?.data?.bookingId) {
      booked = body;
      break;
    }
  }
  if (!booked?.data?.bookingId) throw new Error("The hotel could not be held.");
  return {
    bookingId: booked.data.bookingId,
    confirmation: booked.data.hotelConfirmationCode || booked.data.bookingId,
  };
}

export async function cancelHotelBooking(bookingId: string) {
  const key = reservationKeys().liteapi;
  if (!key) throw new Error("Hotel holds are not available.");
  const response = await fetch(`https://api.liteapi.travel/v3.0/bookings/${encodeURIComponent(bookingId)}`, {
    method: "PUT",
    headers: headers(key),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("The hotel booking could not be cancelled.");
}
