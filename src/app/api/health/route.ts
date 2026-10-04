import { NextResponse } from "next/server";
import { sql } from "@/lib/data/db";

export async function GET() {
  try {
    await sql("select 1 as ok");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
