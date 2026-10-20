import "server-only";
import { one, sql } from "@/lib/data/db";
import { sendMail } from "@/lib/email";
import { reservationReadyMail } from "@/lib/email-template";
import { getSiteSettings } from "@/lib/data/settings";
import { readStoredBytes, storeBytes } from "@/lib/storage";
import { getAirport } from "./airports";
import { cancelFlightHold, createFlightHold, findHoldableFlight } from "./duffel";
import { fetchExistingPolicy } from "./insurance";
import { buildItinerary } from "./itinerary";
import { bookRefundableHotel, cancelHotelBooking, findRefundableHotel } from "./liteapi";
import { getTravelOrder, type TravelFile, type TravelOrder } from "./orders";
import { flightPdf, hotelPdf, itineraryPdf } from "./pdf";
import { travelToken } from "./token";
import { env } from "@/lib/env";

async function saveFile(order: TravelOrder, kind: TravelFile["kind"], name: string, bytes: Buffer) {
  const path = `reservations/${order.id}/${name}`;
  await storeBytes(path, bytes, "application/pdf");
  return { kind, path, name } satisfies TravelFile;
}

async function mark(id: string, status: string, error: string | null) {
  await sql(`update travel_orders set status = $2, error = $3, updated_at = now() where id = $1`, [id, status, error]);
}

export async function fulfillTravelOrder(id: string) {
  const locked = await one(`update travel_orders set status = 'fulfilling', error = null, updated_at = now() where id = $1 and status in ('paid', 'needs_attention') returning id`, [id]);
  if (!locked) return;
  const order = await getTravelOrder(id);
  if (!order) return;
  const input = order.input;
  const files = [...order.files];
  const person = { title: input.title, firstName: input.firstName, lastName: input.lastName, passportNo: input.passportNo };
  try {
    if (input.services.flight && !order.flightPnr) {
      const flight = order.quote.flight?.expiresAt && new Date(order.quote.flight.expiresAt).getTime() > Date.now()
        ? order.quote.flight
        : await findHoldableFlight(input);
      const held = await createFlightHold(input, flight);
      await sql(
        `update travel_orders set flight_pnr = $2, flight_order_id = $3, flight_hold_until = $4, quote = $5::jsonb, updated_at = now() where id = $1`,
        [order.id, held.pnr, held.orderId, held.holdUntil, JSON.stringify({ ...order.quote, flight })],
      );
      order.flightPnr = held.pnr;
      order.flightOrderId = held.orderId;
      order.flightHoldUntil = held.holdUntil;
      files.push(await saveFile(order, "flight", "flight-reservation.pdf", flightPdf({
        reference: order.reference,
        people: [person, ...input.companions.map((item) => ({ title: item.title, firstName: item.firstName, lastName: item.lastName }))],
        pnr: held.pnr,
        status: "Reserved — not ticketed",
        holdUntil: held.holdUntil,
        legs: flight.legs,
      })));
    }
    if (input.services.hotel && !order.hotelBookingId) {
      const hotel = await findRefundableHotel(input);
      const booked = await bookRefundableHotel(input, hotel);
      await sql(
        `update travel_orders set hotel_confirmation = $2, hotel_booking_id = $3, hotel_cancel_until = $4, updated_at = now() where id = $1`,
        [order.id, booked.confirmation, booked.bookingId, hotel.cancelUntil],
      );
      order.hotelConfirmation = booked.confirmation;
      files.push(await saveFile(order, "hotel", "hotel-reservation.pdf", hotelPdf({
        person,
        hotel,
        confirmation: booked.confirmation,
        cancelUntil: hotel.cancelUntil,
      })));
    }
    if (input.services.itinerary && !files.some((file) => file.kind === "itinerary")) {
      const destination = input.toIata ? await getAirport(input.toIata) : null;
      const place = destination ? `${destination.city}, ${destination.country}` : input.toIata;
      const itinerary = await buildItinerary(input, place, order.quote.hotel?.name);
      files.push(await saveFile(order, "itinerary", "itinerary.pdf", itineraryPdf(itinerary)));
    }
    if (input.services.insurance && !files.some((file) => file.kind === "insurance")) {
      const policy = await fetchExistingPolicy(input.policyNo, input.passportNo);
      files.push(await saveFile(order, "insurance", "insurance.pdf", policy));
    }
    await sql(`update travel_orders set files = $2::jsonb, updated_at = now() where id = $1`, [order.id, JSON.stringify(files)]);
    const settings = await getSiteSettings();
    const link = `${env.siteUrl}/${order.locale}/travel-reservations/status?token=${encodeURIComponent(travelToken(order.id))}`;
    const mail = reservationReadyMail({
      locale: order.locale,
      brand: settings.name,
      tagline: settings.tagline,
      supportEmail: settings.supportEmail,
      reference: order.reference,
      href: link,
    });
    const attachments = await Promise.all(files.map(async (file) => ({
      filename: file.name,
      content: await readStoredBytes(file.path),
      contentType: "application/pdf",
    })));
    const sent = await sendMail({ to: order.email, subject: mail.subject, text: mail.text, html: mail.html, attachments, idempotencyKey: `travel-${order.id}` });
    if (!sent.sent && process.env.NODE_ENV === "production") {
      await mark(order.id, "needs_attention", "The files are ready, but the email could not be sent.");
      return;
    }
    await mark(order.id, "sent", null);
  } catch (error) {
    await sql(`update travel_orders set files = $2::jsonb, status = 'needs_attention', error = $3, updated_at = now() where id = $1`, [
      order.id,
      JSON.stringify(files),
      error instanceof Error ? error.message : "The reservation could not be completed.",
    ]);
  }
}

export async function cancelTravelBookings(order: TravelOrder) {
  if (order.flightOrderId) await cancelFlightHold(order.flightOrderId);
  if (order.hotelBookingId) await cancelHotelBooking(order.hotelBookingId);
}
