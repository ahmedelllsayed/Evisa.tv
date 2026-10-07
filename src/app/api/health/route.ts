import { NextResponse } from "next/server";
import { sql } from "@/lib/data/db";

export async function GET() {
  try {
    await sql("select 1 as ok");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "database unavailable";
    console.error(`health check failed: ${message}`);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
