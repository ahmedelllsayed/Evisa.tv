import { NextResponse } from "next/server";
import { recordFunnel } from "@/lib/data/growth";
import { getSiteSettings } from "@/lib/data/settings";
import { funnelName } from "@/lib/funnel";

export async function POST(request: Request) {
  const settings = await getSiteSettings();
  if (settings.extras.consentEnabled && !(request.headers.get("cookie") ?? "").includes("analytics_consent=granted")) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const body = (await request.json().catch(() => null)) as { name?: unknown; slug?: unknown; locale?: unknown } | null;
  const name = funnelName(typeof body?.name === "string" ? body.name : "");
  if (!name) return NextResponse.json({ ok: false }, { status: 400 });
  const slug = typeof body?.slug === "string" ? body.slug.replace(/[^a-z0-9-]/gi, "").slice(0, 80) : "";
  const locale = typeof body?.locale === "string" && /^(en|ar)-EG$/.test(body.locale) ? body.locale : null;
  const device = /mobile|android|iphone|ipad/i.test(request.headers.get("user-agent") ?? "") ? "mobile" : "desktop";
  await recordFunnel(name, locale, slug || null, device);
  return NextResponse.json({ ok: true });
}
