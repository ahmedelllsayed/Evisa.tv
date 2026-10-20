import "server-only";
import { jsPDF } from "jspdf";
import type { Itinerary } from "./itinerary";
import type { FlightLeg } from "./duffel";
import type { HoldableHotel } from "./liteapi";

type Person = { title: string; firstName: string; lastName: string; passportNo?: string };

const brand: [number, number, number] = [80, 87, 234];

function pdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  return doc;
}

function heading(doc: jsPDF, title: string, reference: string) {
  doc.setFillColor(...brand);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 14, 11);
  doc.setFontSize(9);
  doc.text(reference, 196, 11, { align: "right" });
  doc.setTextColor(22, 24, 43);
}

function line(doc: jsPDF, label: string, value: string, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 96, 120);
  doc.text(label, 14, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 24, 43);
  const lines = doc.splitTextToSize(value || "—", 120);
  doc.text(lines, 70, y);
  return y + Math.max(6, lines.length * 4.5);
}

export function flightPdf(input: {
  reference: string;
  people: Person[];
  pnr: string;
  status: string;
  holdUntil: string | null;
  legs: FlightLeg[];
}) {
  const doc = pdf();
  heading(doc, "Flight reservation", input.pnr);
  let y = 28;
  y = line(doc, "Booking reference", input.pnr, y);
  y = line(doc, "Status", input.status, y);
  y = line(doc, "Hold until", input.holdUntil ? input.holdUntil.slice(0, 16).replace("T", " ") : "As stated by the airline", y);
  y = line(doc, "Travellers", input.people.map((person) => `${person.title.toUpperCase()} ${person.firstName} ${person.lastName}`).join(", "), y);
  y = line(doc, "Passport", input.people[0]?.passportNo || "—", y);
  y += 4;
  for (const leg of input.legs) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(246, 247, 251);
    doc.rect(14, y, 182, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${leg.from}  →  ${leg.to}`, 18, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${leg.carrier} ${leg.flightNumber} · ${leg.cabin}`, 18, y + 15);
    doc.text(`${leg.departAt.replace("T", " ")}  →  ${leg.arriveAt.replace("T", " ")}`, 18, y + 21);
    y += 34;
  }
  doc.setFontSize(8);
  doc.setTextColor(90, 96, 120);
  doc.text("This reservation is held and not ticketed. The airline booking reference can be checked with the operating carrier.", 14, 280, { maxWidth: 180 });
  return Buffer.from(doc.output("arraybuffer"));
}

export function hotelPdf(input: { person: Person; hotel: HoldableHotel; confirmation: string; cancelUntil: string | null }) {
  const doc = pdf();
  heading(doc, "Hotel reservation", input.confirmation);
  let y = 28;
  y = line(doc, "Confirmation", input.confirmation, y);
  y = line(doc, "Status", "Booked, free cancellation", y);
  y = line(doc, "Cancel until", input.cancelUntil ? input.cancelUntil.slice(0, 16).replace("T", " ") : "As stated by the property", y);
  y = line(doc, "Guest", `${input.person.title.toUpperCase()} ${input.person.firstName} ${input.person.lastName}`, y);
  y = line(doc, "Property", input.hotel.name, y);
  y = line(doc, "Address", `${input.hotel.address}, ${input.hotel.city}`, y);
  y = line(doc, "Stay", `${input.hotel.checkIn} to ${input.hotel.checkOut}`, y);
  line(doc, "Room", input.hotel.room, y);
  doc.setFontSize(8);
  doc.setTextColor(90, 96, 120);
  doc.text("Present this voucher and a passport at the property. Cancel before the deadline to avoid a charge.", 14, 280, { maxWidth: 180 });
  return Buffer.from(doc.output("arraybuffer"));
}

export function itineraryPdf(itinerary: Itinerary) {
  const doc = pdf();
  heading(doc, "Travel itinerary", itinerary.destination);
  let y = 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const overview = doc.splitTextToSize(itinerary.overview || "", 180);
  doc.text(overview, 14, y);
  y += overview.length * 5 + 6;
  for (const day of itinerary.days) {
    const block = `${day.title}\nMorning: ${day.morning}\nAfternoon: ${day.afternoon}\nEvening: ${day.evening}`;
    const lines = doc.splitTextToSize(block, 176);
    if (y + lines.length * 4.5 > 275) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`Day ${day.day} · ${day.date}`, 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 5;
  }
  return Buffer.from(doc.output("arraybuffer"));
}
