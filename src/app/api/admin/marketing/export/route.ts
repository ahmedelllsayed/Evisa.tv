import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site.config";
import { marketingAccess } from "@/lib/data/marketing/access";
import { campaignsCsv, couponCodesCsv, couponUsesCsv, messagesCsv } from "@/lib/data/marketing/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await marketingAccess(siteConfig.defaultLocale);
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "";
  const id = url.searchParams.get("id") ?? "";
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const validId = /^[0-9a-f-]{36}$/i.test(id);
  let body: string | null = null;
  if (kind === "campaigns") body = await campaignsCsv(days);
  else if (kind === "recipients" && validId) body = await messagesCsv(id);
  else if (kind === "coupon-uses" && validId) body = await couponUsesCsv(id);
  else if (kind === "coupon-codes" && validId) body = await couponCodesCsv(id, siteConfig.url.replace(/\/$/, ""));
  if (body == null) return NextResponse.json({ ok: false }, { status: 404 });
  return new NextResponse(`\uFEFF${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${kind}.csv`,
    },
  });
}
