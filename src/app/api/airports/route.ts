import { NextResponse } from "next/server";
import { searchAirports } from "@/lib/reservations/airports";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const airports = await searchAirports(query);
  return NextResponse.json({ airports });
}
