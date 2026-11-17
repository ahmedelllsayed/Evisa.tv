import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { suppressAddress } from "@/lib/data/marketing/queue";
import { normalizeEmail } from "@/lib/marketing/audience";

function page(title: string, message: string) {
  return new Response(
    `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>${title}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:Tahoma,Arial,sans-serif;background:#f6f7fb;color:#16182b"><main style="max-width:28rem;padding:32px;text-align:center"><h1 style="font-size:22px">${title}</h1><p>${message}</p></main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

/** Links in emails sent before the marketing queue carried an HMAC of the address. */
function tokenOk(email: string, token: string) {
  if (!email || !token) return false;
  const expected = Buffer.from(createHmac("sha256", serverEnv().authSecret).update(email).digest("base64url"));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email") ?? "");
  const token = url.searchParams.get("token") ?? "";
  if (!tokenOk(email, token)) return page("الرابط غير صالح", "تعذر إلغاء الاشتراك من هذا الرابط.");
  await suppressAddress("email", email, "unsubscribed");
  return page("تم إلغاء الاشتراك", "لن تصلك رسائل العروض بعد الآن. رسائل الدخول والطلبات لا تتأثر.");
}
