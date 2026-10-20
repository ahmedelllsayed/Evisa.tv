import "server-only";
import { one, sql } from "@/lib/data/db";
import { sendMail } from "@/lib/email";
import { reservationReadyMail } from "@/lib/email-template";
import { getSiteSettings } from "@/lib/data/settings";
import { env } from "@/lib/env";
import { readStoredBytes, storeBytes } from "@/lib/storage";
import { getAirport } from "./airports";
import { agodaCabin, searchAgodaFlight, searchAgodaHotel, type FlightSchedule, type HotelQuote } from "./agoda";
import { addIsoDays } from "./limits";
import { buildItinerary } from "./itinerary";
import { getTravelOrder, type TravelFile, type TravelOrder } from "./orders";
import { flightPdf, hotelPdf, itineraryPdf } from "./pdf";
import { travelToken } from "./token";

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
  const person = `${input.title.toUpperCase()} ${input.firstName} ${input.lastName}`;
  try {
    const destination = input.toIata ? await getAirport(input.toIata) : null;
    const origin = input.fromIata ? await getAirport(input.fromIata) : null;
    let flight: FlightSchedule | undefined = order.quote.flight;
    let hotel: HotelQuote | undefined = order.quote.hotel;
    const checkOut = input.returnDate || addIsoDays(input.departDate, 5);
    if (input.services.flight && !files.some((file) => file.kind === "flight")) {
      if (!flight?.legs.length) {
        if (!origin || !destination) throw new Error("Choose the departure airport");
        const cabin = agodaCabin(input.cabin);
        const outbound = await searchAgodaFlight(origin, destination, input.departDate, input.adults, cabin);
        const inbound = input.tripType === "roundtrip" && input.returnDate
          ? await searchAgodaFlight(destination, origin, input.returnDate, input.adults, cabin)
          : undefined;
        flight = { legs: [...outbound.legs, ...(inbound?.legs ?? [])], stopCount: outbound.stopCount };
      }
      files.push(await saveFile(order, "flight", "flight-schedule.pdf", flightPdf({ person, legs: flight.legs })));
    }
    if (input.services.hotel && !files.some((file) => file.kind === "hotel")) {
      if (!hotel?.name) {
        if (!destination) throw new Error("Destination and travel dates are required");
        hotel = await searchAgodaHotel(destination.city, destination.country, input.departDate, checkOut, input.adults);
      }
      files.push(await saveFile(order, "hotel", "hotel-availability.pdf", hotelPdf({ person, hotel })));
    }
    if (input.services.itinerary && !files.some((file) => file.kind === "itinerary")) {
      const place = destination ? `${destination.city}, ${destination.country}` : input.toIata;
      const itinerary = await buildItinerary(input, place, hotel?.name);
      files.push(await saveFile(order, "itinerary", "itinerary.pdf", itineraryPdf(itinerary)));
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
      error instanceof Error ? error.message : "The files could not be prepared.",
    ]);
  }
}
