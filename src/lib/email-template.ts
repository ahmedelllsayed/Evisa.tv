import { siteConfig } from "@/config/site.config";
import { isArabicLocale } from "@/lib/i18n";

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const copy = {
  en: {
    codeIntro: "Use this code to sign in. It expires in 10 minutes. If you did not ask for it, ignore this email.",
    codeLabel: "Sign-in code",
    view: "Open the application",
    account: "Open your account",
    reference: "Reference",
    country: "Destination",
    visa: "Visa type",
    status: "Status",
    target: "Target date",
    travellers: "Travellers",
    total: "Total",
    speed: "Speed",
    express: "Express",
    standard: "Standard",
    files: "Files attached",
    replyIntro: "A reply from our team:",
    footnote: "This email is about your application with {brand}. Staff review each file. It is not a message from a government.",
    meanings: {
      draft: "The application is still a draft. You can finish it from your account.",
      payment_pending: "We are waiting for the payment before the file can move forward.",
      submitted: "We received the application. A staff member will review it. Nothing is sent to an authority automatically.",
      in_review: "Staff are checking the file. Nothing is sent to an authority automatically.",
      filed: "A staff member is filing this application by hand.",
      approved: "The visa was approved. The file is in your account, and it is attached when we send the visa email.",
      rejected: "The application was refused. Open your account for the note from our team.",
      cancelled: "This application was cancelled.",
      refunded: "The payment for this application was refunded.",
    } as Record<string, string>,
  },
  ar: {
    codeIntro: "استخدم هذا الرمز لتسجيل الدخول. ينتهي خلال 10 دقائق. إذا لم تطلب الرمز، تجاهل هذه الرسالة.",
    codeLabel: "رمز الدخول",
    view: "افتح الطلب",
    account: "افتح حسابك",
    reference: "رقم الطلب",
    country: "الوجهة",
    visa: "نوع التأشيرة",
    status: "الحالة",
    target: "الموعد المستهدف",
    travellers: "المسافرون",
    total: "الإجمالي",
    speed: "السرعة",
    express: "سريع",
    standard: "عادي",
    files: "ملفات مرفقة",
    replyIntro: "رد من فريقنا:",
    footnote: "هذه الرسالة عن طلبك لدى {brand}. يراجع الفريق كل ملف. ليست رسالة من جهة حكومية.",
    meanings: {
      draft: "الطلب ما زال مسودة. يمكنك إكماله من حسابك.",
      payment_pending: "ننتظر إتمام الدفع قبل أن يتقدم الملف.",
      submitted: "استلمنا الطلب. سيراجعه أحد الموظفين. لا يُرسل شيء إلى جهة تلقائياً.",
      in_review: "يراجع الفريق الملف الآن. لا يُرسل شيء إلى جهة تلقائياً.",
      filed: "يقدّم أحد الموظفين هذا الطلب يدوياً.",
      approved: "تمت الموافقة على التأشيرة. الملف موجود في حسابك، ويُرفق عند إرسال بريد ملف التأشيرة.",
      rejected: "رُفض الطلب. افتح حسابك لقراءة ملاحظة الفريق.",
      cancelled: "أُلغي هذا الطلب.",
      refunded: "أُعيد مبلغ هذا الطلب.",
    } as Record<string, string>,
  },
};

function lang(locale: string) {
  return isArabicLocale(locale) ? copy.ar : copy.en;
}

function shell(locale: string, brand: string, preview: string, inner: string, extra?: { tagline?: string; email?: string }) {
  const arabic = isArabicLocale(locale);
  const dir = arabic ? "rtl" : "ltr";
  const align = arabic ? "right" : "left";
  const font = arabic ? "Tahoma, Arial, sans-serif" : "Segoe UI, Arial, sans-serif";
  const tagline = extra?.tagline?.trim() || siteConfig.tagline;
  const email = extra?.email?.trim() || "";
  return `<!doctype html>
<html lang="${arabic ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(brand)}</title>
<style>
@keyframes evisaRise { from { transform: translateY(10px); } to { transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  .evisa-card { animation: evisaRise 0.7s ease both; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#f4f5fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" class="evisa-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e5f2;border-radius:24px;overflow:hidden;font-family:${font};color:#16182b;text-align:${align};">
      <tr><td style="height:6px;background:#5057ea;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="background:#16182b;padding:22px 28px;">
        <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.2px;color:#ffffff;">${esc(brand)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#ffd873;">${esc(tagline)}</p>
      </td></tr>
      <tr><td style="height:4px;background:#ffd873;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:28px;">${inner}</td></tr>
      <tr><td style="padding:0 28px 24px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#69727b;">${esc(lang(locale).footnote.replace("{brand}", brand))}</p>
        ${email ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.6;"><a href="mailto:${esc(email)}" style="color:#5057ea;text-decoration:none;">${esc(email)}</a></p>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #eef0f6;font-size:13px;color:#69727b;width:42%;vertical-align:top;">${esc(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #eef0f6;font-size:14px;font-weight:600;color:#16182b;vertical-align:top;">${esc(value)}</td>
  </tr>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr><td style="border-radius:999px;background:#5057ea;">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(label)}</a>
  </td></tr></table>`;
}

export function signInCodeMail(locale: string, brand: string, code: string, tagline = "", supportEmail = "") {
  const text = lang(locale);
  const subject = isArabicLocale(locale) ? `رمز الدخول إلى ${brand}` : `Your ${brand} sign-in code`;
  const plain = `${text.codeIntro}\n\n${text.codeLabel}: ${code}`;
  const html = shell(
    locale,
    brand,
    `${text.codeLabel} ${code}`,
    `<p style="margin:0 0 8px;font-size:13px;color:#69727b;">${esc(text.codeLabel)}</p>
     <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:8px;color:#16182b;">${esc(code)}</p>
     <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#3b3b3b;">${esc(text.codeIntro)}</p>`,
    { tagline, email: supportEmail },
  );
  return { subject, text: plain, html };
}

export function statusUpdateMail(input: {
  locale: string;
  brand: string;
  country: string;
  visaType: string;
  reference: string;
  status: string;
  statusKey: string;
  target: string;
  travellers: number;
  total: string;
  express: boolean;
  applicationId: string;
  tagline?: string;
  supportEmail?: string;
}) {
  const text = lang(input.locale);
  const meaning = text.meanings[input.statusKey] ?? "";
  const speed = input.express ? text.express : text.standard;
  const tone = statusTone(input.statusKey);
  const href = `${siteConfig.url}/${input.locale}/account/applications/${input.applicationId}`;
  const subject = isArabicLocale(input.locale)
    ? `${input.country}: ${input.status} · ${input.reference}`
    : `${input.country}: ${input.status} · ${input.reference}`;
  const plain = [
    `${input.country} — ${input.visaType}`,
    `${text.reference}: ${input.reference}`,
    `${text.status}: ${input.status}`,
    meaning,
    `${text.target}: ${input.target}`,
    `${text.speed}: ${speed}`,
    `${text.travellers}: ${input.travellers}`,
    `${text.total}: ${input.total}`,
    href,
  ].join("\n");
  const html = shell(
    input.locale,
    input.brand,
    `${input.country} · ${input.status}`,
    `<p style="display:inline-block;margin:0;padding:6px 12px;border-radius:999px;background:${tone.bg};color:${tone.fg};font-size:13px;font-weight:700;">${esc(input.status)}</p>
     <h1 style="margin:14px 0 0;font-size:26px;line-height:1.25;font-weight:700;">${esc(input.country)}</h1>
     <p style="margin:6px 0 0;font-size:15px;color:#3b3b3b;">${esc(input.visaType)}</p>
     <p style="margin:14px 0 0;font-size:14px;line-height:1.65;color:#3b3b3b;">${esc(meaning)}</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
       ${row(text.reference, input.reference)}
       ${row(text.visa, input.visaType)}
       ${row(text.target, input.target)}
       ${row(text.speed, speed)}
       ${row(text.travellers, String(input.travellers))}
       ${row(text.total, input.total)}
     </table>
     ${button(href, text.view)}`,
    { tagline: input.tagline, email: input.supportEmail },
  );
  return { subject, text: plain, html };
}

function arabicFileCount(count: number) {
  if (count === 1) return "ملفاً واحداً";
  if (count === 2) return "ملفين";
  if (count >= 3 && count <= 10) return `${count} ملفات`;
  return `${count} ملفاً`;
}

function statusTone(status: string) {
  if (status === "approved") return { bg: "#e7f8ee", fg: "#148a45" };
  if (status === "rejected" || status === "refunded") return { bg: "#fdecea", fg: "#b42318" };
  if (status === "cancelled") return { bg: "#f3f4f6", fg: "#69727b" };
  if (status === "payment_pending") return { bg: "#fff6dc", fg: "#8a6a12" };
  return { bg: "#eef0ff", fg: "#373ed0" };
}

export function visaFilesMail(input: {
  locale: string;
  brand: string;
  country: string;
  visaType: string;
  reference: string;
  files: number;
  applicationId: string;
  tagline?: string;
  supportEmail?: string;
}) {
  const text = lang(input.locale);
  const href = `${siteConfig.url}/${input.locale}/account/applications/${input.applicationId}`;
  const intro = isArabicLocale(input.locale)
    ? `ملف تأشيرة ${input.country} جاهز. أرفقنا ${arabicFileCount(input.files)} في هذه الرسالة، وهو متاح أيضاً في حسابك.`
    : `Your ${input.country} visa file is ready. ${input.files === 1 ? "1 file is" : `${input.files} files are`} attached to this email and also saved in your account.`;
  const subject = isArabicLocale(input.locale) ? `ملف تأشيرة ${input.country} جاهز · ${input.reference}` : `${input.country} visa file ready · ${input.reference}`;
  const plain = [intro, `${text.visa}: ${input.visaType}`, `${text.reference}: ${input.reference}`, href].join("\n");
  const html = shell(
    input.locale,
    input.brand,
    intro,
    `<h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;">${esc(isArabicLocale(input.locale) ? "التأشيرة جاهزة" : "Your visa is ready")}</h1>
     <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:#3b3b3b;">${esc(intro)}</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
       ${row(text.country, input.country)}
       ${row(text.visa, input.visaType)}
       ${row(text.reference, input.reference)}
       ${row(text.files, String(input.files))}
     </table>
     ${button(href, text.view)}`,
    { tagline: input.tagline, email: input.supportEmail },
  );
  return { subject, text: plain, html };
}

export function staffReplyMail(locale: string, brand: string, message: string, tagline = "", supportEmail = "") {
  const text = lang(locale);
  const subject = isArabicLocale(locale) ? `رد من ${brand}` : `A reply from ${brand}`;
  const plain = `${text.replyIntro}\n\n${message}`;
  const html = shell(
    locale,
    brand,
    message.slice(0, 140),
    `<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#5057ea;">${esc(text.replyIntro)}</p>
     <p style="margin:0;font-size:15px;line-height:1.7;color:#16182b;white-space:pre-wrap;">${esc(message)}</p>
     ${button(`${siteConfig.url}/${locale}/account`, text.account)}`,
    { tagline, email: supportEmail },
  );
  return { subject, text: plain, html };
}
