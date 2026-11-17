import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site.config";
import { one } from "@/lib/data/db";

const month = 60 * 60 * 24 * 30;

export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const base = new URL(siteConfig.url);
  const home = new URL(`/${siteConfig.defaultLocale}`, base);
  if (!/^[A-Za-z0-9]{10,16}$/.test(token)) return NextResponse.redirect(home);
  const message = await one<{ campaign_id: string | null; locale: string | null; coupon_code: string | null; link_url: string | null }>(
    `update marketing_messages m set clicks = m.clicks + 1, clicked_at = now()
     from (select m2.id, coalesce(c.link_url, a.link_url) as link_url from marketing_messages m2
           left join marketing_campaigns c on c.id = m2.campaign_id
           left join marketing_automations a on a.id = m2.automation_id
           where m2.token = $1) src
     where m.id = src.id
     returning m.campaign_id, m.locale, m.coupon_code, src.link_url`,
    [token],
  );
  if (!message) return NextResponse.redirect(home);
  const locale = message.locale && !message.locale.toLowerCase().startsWith("ar") ? "en-EG" : "ar-EG";
  let target = new URL(`/${locale}`, base);
  if (message.link_url) {
    try {
      target = new URL(message.link_url, base);
    } catch {
      target = new URL(`/${locale}`, base);
    }
  }
  const sameSite = target.host === base.host;
  if (sameSite && message.coupon_code) target.searchParams.set("coupon", message.coupon_code);
  const response = NextResponse.redirect(target);
  if (message.coupon_code) response.cookies.set("coupon", message.coupon_code, { path: "/", maxAge: month, sameSite: "lax" });
  if (message.campaign_id) response.cookies.set("mkt", message.campaign_id, { path: "/", maxAge: month, sameSite: "lax" });
  return response;
}
