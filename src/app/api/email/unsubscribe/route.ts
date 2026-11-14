import { suppressMarketingEmail, unsubscribeTokenOk } from "@/lib/data/campaigns";
import { normalizeEmail } from "@/lib/campaign-mail";

function page(title: string, message: string) {
  return new Response(
    `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>${title}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:Tahoma,Arial,sans-serif;background:#f6f7fb;color:#16182b"><main style="max-width:28rem;padding:32px;text-align:center"><h1 style="font-size:22px">${title}</h1><p>${message}</p></main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email") ?? "");
  const token = url.searchParams.get("token") ?? "";
  if (!unsubscribeTokenOk(email, token)) return page("الرابط غير صالح", "تعذر إلغاء الاشتراك من هذا الرابط.");
  await suppressMarketingEmail(email);
  return page("تم إلغاء الاشتراك", "لن تصلك رسائل العروض بعد الآن. رسائل الدخول والطلبات لا تتأثر.");
}
