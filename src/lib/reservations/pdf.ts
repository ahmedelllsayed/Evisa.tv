import "server-only";
import { jsPDF } from "jspdf";
import type { FlightLeg, HotelQuote } from "./agoda";
import type { Itinerary } from "./itinerary";

const brand: [number, number, number] = [80, 87, 234];

function heading(doc: jsPDF, title: string) {
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 14, 11);
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

export function flightPdf(input: { person: string; legs: FlightLeg[] }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  heading(doc, "Flight schedule");
  let y = line(doc, "Traveller", input.person, 28);
  y = line(doc, "Status", "Published schedule. This is not an airline booking or ticket.", y);
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
    doc.setTextColor(22, 24, 43);
    doc.text(`${leg.from}  →  ${leg.to}`, 18, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${leg.carrier} ${leg.flightNumber}${leg.aircraft ? ` · ${leg.aircraft}` : ""} · ${leg.cabin}`, 18, y + 15);
    doc.text(`${leg.departAt.replace("T", " ").slice(0, 16)}  →  ${leg.arriveAt.replace("T", " ").slice(0, 16)}`, 18, y + 21);
    y += 34;
  }
  return Buffer.from(doc.output("arraybuffer"));
}

export function hotelPdf(input: { person: string; hotel: HotelQuote }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  heading(doc, "Hotel availability");
  let y = 28;
  y = line(doc, "Guest", input.person, y);
  y = line(doc, "Status", "Published rate. This is not a hotel reservation.", y);
  y = line(doc, "Property", input.hotel.name, y);
  y = line(doc, "Address", `${input.hotel.address}, ${input.hotel.city}`, y);
  y = line(doc, "Stay", `${input.hotel.checkIn} to ${input.hotel.checkOut}`, y);
  if (input.hotel.room) y = line(doc, "Room", input.hotel.room, y);
  if (input.hotel.total > 0) y = line(doc, "Published rate", `${input.hotel.total} ${input.hotel.currency}`, y);
  return Buffer.from(doc.output("arraybuffer"));
}

export function itineraryPdf(itinerary: Itinerary) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  heading(doc, "Travel itinerary");
  let y = 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(22, 24, 43);
  const overview = doc.splitTextToSize(itinerary.overview || itinerary.destination, 180);
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
