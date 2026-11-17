import type { Channel } from "./audience.ts";

export const channelLabels: Record<Channel, string> = { email: "البريد", sms: "رسائل نصية", whatsapp: "واتساب" };

export const visaTypeChoices: [string, string][] = [
  ["e-visa", "e-Visa"],
  ["eta", "ETA"],
  ["sticker", "Sticker"],
  ["e-voa", "e-VOA"],
  ["mdac", "MDAC"],
  ["visa-free", "بدون تأشيرة"],
  ["custom", "نوع مخصص"],
];

export const campaignStatusLabels: Record<string, string> = {
  draft: "مسودة",
  scheduled: "مجدولة",
  sending: "جارٍ الإرسال",
  paused: "متوقفة",
  sent: "اكتملت",
  cancelled: "ملغاة",
};

export const messageStatusLabels: Record<string, string> = { pending: "بالانتظار", sent: "أُرسل", failed: "فشل", skipped: "تُرك" };

export const skipReasons: Record<string, string> = {
  unsubscribed: "ألغى الاشتراك",
  cap: "تجاوز الحد",
  cancelled: "أُلغيت الحملة",
  bounce: "ارتد البريد",
  complaint: "شكوى",
  manual: "ممنوع يدوياً",
};

export const triggerLabels: Record<string, { title: string; hint: string }> = {
  abandoned: { title: "بدأ طلباً ولم يدفع", hint: "بعد آخر تعديل على طلب لم يُدفع" },
  lapsed: { title: "اشترى ولم يعد", hint: "بعد آخر طلب مدفوع، إن لم يدفع بعده" },
  approved: { title: "بعد الموافقة على التأشيرة", hint: "بعد تغيير الحالة إلى موافقة" },
  signup: { title: "سجّل ولم يبدأ طلباً", hint: "بعد التسجيل، إن لم يفتح أي طلب" },
};

export function marketingDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

export function money(value: number) {
  return `${new Intl.NumberFormat("en-US").format(Math.round(value))} ج.م`;
}
