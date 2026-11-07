import { normalizeSearch } from "./search-text";

type ReasonExtra = { titleAr: string; bodyAr: string; tipEn: string; tipAr: string };

/** Arabic copy and advice for the built-in default reasons, used only when a destination's reason has no Arabic of its own. */
const known: Record<string, ReasonExtra> = {
  "expired passport": {
    titleAr: "جواز منتهي أو قارب على الانتهاء",
    bodyAr: "التقديم بجواز منتهي الصلاحية أو تنتهي صلاحيته خلال 6 أشهر.",
    tipEn: "Renew the passport first, so it stays valid at least 6 months after you travel.",
    tipAr: "جدّد الجواز أولاً ليبقى صالحاً 6 أشهر على الأقل بعد السفر.",
  },
  "criminal record": {
    titleAr: "سجل جنائي",
    bodyAr: "وجود سوابق جنائية تمنع الحصول على التأشيرة.",
    tipEn: "Answer every question honestly and attach any court papers the authority asks for.",
    tipAr: "أجب عن كل سؤال بصدق، وأرفق أي أوراق قضائية تطلبها الجهة.",
  },
  "previous visa violations": {
    titleAr: "مخالفة تأشيرة سابقة",
    bodyAr: "تجاوز مدة الإقامة أو مخالفة شروط تأشيرة سابقة.",
    tipEn: "Declare it on the form. Some countries set a waiting period before a new application.",
    tipAr: "صرّح بها في الطلب. بعض الدول تشترط مدة انتظار قبل التقديم من جديد.",
  },
};

export function reasonExtra(title: string): ReasonExtra | null {
  return known[normalizeSearch(title)] ?? null;
}
