import { NextResponse } from "next/server";
import { recordFunnel } from "@/lib/data/growth";
import { funnelName } from "@/lib/funnel";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown; slug?: unknown; locale?: unknown } | null;
  const name = funnelName(typeof body?.name === "string" ? body.name : "");
  if (!name) return NextResponse.json({ ok: false }, { status: 400 });
  const slug = typeof body?.slug === "string" ? body.slug.replace(/[^a-z0-9-]/gi, "").slice(0, 80) : "";
  const locale = typeof body?.locale === "string" && /^(en|ar)-EG$/.test(body.locale) ? body.locale : null;
  await recordFunnel(name, locale, slug || null);
  return NextResponse.json({ ok: true });
}
