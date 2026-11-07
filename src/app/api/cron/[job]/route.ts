import { NextResponse } from "next/server";
import { runJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret || given !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { job } = await ctx.params;
  const result = await runJob(job);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
