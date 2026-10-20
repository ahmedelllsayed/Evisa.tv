import "server-only";
import { randomBytes } from "node:crypto";
import { json, one, sql } from "@/lib/data/db";
import type { HoldableFlight } from "./duffel";
import type { HoldableHotel } from "./liteapi";
import type { ReservationFees, ReservationServices } from "./pricing";
import type { ReservationInput } from "./schema";

export type TravelFile = { kind: "flight" | "hotel" | "itinerary" | "insurance"; path: string; name: string };
export type TravelStatus = "pending_payment" | "paid" | "fulfilling" | "sent" | "needs_attention" | "cancelled" | "refunded";

export type TravelOrder = {
  id: string;
  reference: string;
  locale: string;
  email: string;
  phone: string;
  services: ReservationServices;
  input: ReservationInput;
  quote: { flight?: HoldableFlight; hotel?: HoldableHotel };
  amount: number;
  currency: string;
  status: TravelStatus;
  merchantOrderId: string | null;
  paymobOrderId: string | null;
  transactionId: string | null;
  flightPnr: string | null;
  flightOrderId: string | null;
  flightHoldUntil: string | null;
  hotelConfirmation: string | null;
  hotelBookingId: string | null;
  hotelCancelUntil: string | null;
  files: TravelFile[];
  error: string | null;
  createdAt: string;
};

type Row = Record<string, unknown>;

function mapOrder(row: Row): TravelOrder {
  const input = json<ReservationInput>(row.passenger, {} as ReservationInput);
  return {
    id: String(row.id),
    reference: String(row.reference),
    locale: String(row.locale),
    email: String(row.email),
    phone: String(row.phone),
    services: json<ReservationServices>(row.services, { flight: false, hotel: false, itinerary: false, insurance: false }),
    input,
    quote: json(row.quote, {}),
    amount: Number(row.amount),
    currency: String(row.currency).trim(),
    status: String(row.status) as TravelStatus,
    merchantOrderId: (row.merchant_order_id as string) ?? null,
    paymobOrderId: (row.paymob_order_id as string) ?? null,
    transactionId: (row.transaction_id as string) ?? null,
    flightPnr: (row.flight_pnr as string) ?? null,
    flightOrderId: (row.flight_order_id as string) ?? null,
    flightHoldUntil: row.flight_hold_until ? String(row.flight_hold_until) : null,
    hotelConfirmation: (row.hotel_confirmation as string) ?? null,
    hotelBookingId: (row.hotel_booking_id as string) ?? null,
    hotelCancelUntil: row.hotel_cancel_until ? String(row.hotel_cancel_until) : null,
    files: json<TravelFile[]>(row.files, []),
    error: (row.error as string) ?? null,
    createdAt: String(row.created_at),
  };
}

const select = `select * from travel_orders`;

export function newTravelReference() {
  return `TR-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function insertTravelOrder(input: ReservationInput, quote: TravelOrder["quote"], amount: number, fees: ReservationFees) {
  const reference = newTravelReference();
  const row = await one(
    `insert into travel_orders
      (reference, locale, email, phone, services, passenger, trip, quote, amount, currency, merchant_order_id)
     values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,'EGP',$1)
     returning *`,
    [
      reference,
      input.locale,
      input.email,
      input.phone,
      JSON.stringify(input.services),
      JSON.stringify(input),
      JSON.stringify({
        fromIata: input.fromIata,
        toIata: input.toIata,
        tripType: input.tripType,
        departDate: input.departDate,
        returnDate: input.returnDate,
        cabin: input.cabin,
        fees,
      }),
      JSON.stringify(quote),
      amount,
    ],
  );
  return row ? mapOrder(row) : null;
}

export async function getTravelOrder(id: string) {
  const row = await one(`${select} where id = $1`, [id]);
  return row ? mapOrder(row) : null;
}

export async function getTravelOrderByMerchant(merchantOrderId: string) {
  const row = await one(`${select} where merchant_order_id = $1`, [merchantOrderId]);
  return row ? mapOrder(row) : null;
}

export async function listTravelOrders(status?: string) {
  const rows = status
    ? await sql(`${select} where status = $1 order by created_at desc limit 200`, [status])
    : await sql(`${select} order by created_at desc limit 200`);
  return rows.map(mapOrder);
}

export async function travelAttentionCount() {
  const row = await one<{ n: number }>(`select count(*)::int as n from travel_orders where status = 'needs_attention'`);
  return row?.n ?? 0;
}

export async function patchTravelOrder(id: string, patch: Record<string, unknown>) {
  const columns = Object.keys(patch);
  if (!columns.length) return getTravelOrder(id);
  const values = columns.map((key) => patch[key]);
  const sets = columns.map((key, index) => `${key} = $${index + 2}`);
  const row = await one(`update travel_orders set ${sets.join(", ")}, updated_at = now() where id = $1 returning *`, [id, ...values]);
  return row ? mapOrder(row) : null;
}
