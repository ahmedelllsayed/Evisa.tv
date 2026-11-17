import type { Channel } from "@/lib/marketing/audience";
import { one, sql } from "@/lib/data/db";
import { suppressAddress } from "@/lib/data/marketing/queue";

function page(english: boolean, done: boolean) {
  const title = done ? (english ? "You are unsubscribed" : "تم إلغاء الاشتراك") : english ? "Link not valid" : "الرابط غير صالح";
  const body = done
    ? english
      ? "You will not get offers on this channel. Sign-in and application messages are not affected."
      : "لن تصلك العروض على هذه القناة. رسائل الدخول والطلبات لا تتأثر."
    : english
      ? "We could not unsubscribe you from this link."
      : "تعذر إلغاء الاشتراك من هذا الرابط.";
  return new Response(
    `<!doctype html><html lang="${english ? "en" : "ar"}" dir="${english ? "ltr" : "rtl"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:Tahoma,Arial,sans-serif;background:#f6f7fb;color:#16182b"><main style="max-width:28rem;padding:32px;text-align:center"><h1 style="font-size:22px">${title}</h1><p>${body}</p></main></body></html>`,
    { status: done ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function stop(token: string) {
  if (!/^[A-Za-z0-9]{10,16}$/.test(token)) return null;
  const message = await one<{ id: string; channel: Channel; address: string; locale: string | null }>(
    "select id, channel, address, locale from marketing_messages where token = $1",
    [token],
  );
  if (!message) return null;
  await suppressAddress(message.channel, message.address, "unsubscribed");
  await sql("update marketing_messages set unsubscribed_at = coalesce(unsubscribed_at, now()) where id = $1", [message.id]);
  return message;
}

export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const message = await stop((await ctx.params).token);
  const english = Boolean(message?.locale && !message.locale.toLowerCase().startsWith("ar"));
  return page(english, Boolean(message));
}

export async function POST(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const message = await stop((await ctx.params).token);
  return new Response(null, { status: message ? 200 : 404 });
}
