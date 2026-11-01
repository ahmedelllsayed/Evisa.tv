import { NextResponse } from "next/server";
import { recordFunnel } from "@/lib/data/growth";
import { getSiteSettings } from "@/lib/data/settings";

export async function GET(request: Request) {
  const settings = await getSiteSettings();
  const target = settings.extras.offerUrl;
  if (!target) return NextResponse.redirect(new URL("/", request.url));
  const locale = new URL(request.url).searchParams.get("locale");
  await recordFunnel("offer_click", locale === "ar-EG" || locale === "en-EG" ? locale : null, null);
  return NextResponse.redirect(target);
}
