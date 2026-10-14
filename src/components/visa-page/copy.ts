import { isArabicLocale } from "@/lib/i18n";

const copy = {
  home: { en: "Home", ar: "الرئيسية" },
  title: { en: "{name} visa for Egyptians", ar: "تأشيرة {name} للمصريين" },
  stayUpTo: { en: "Stay up to {value}", ar: "إقامة حتى {value}" },
  docsCount: { en: "{n} documents", ar: "{n} مستندات" },
  docsCountOne: { en: "1 document", ar: "مستند واحد" },
  tabTypes: { en: "Visa types", ar: "الأنواع" },
  tabSpeed: { en: "Timing", ar: "الموعد" },
  tabDocs: { en: "Documents", ar: "المستندات" },
  tabSteps: { en: "How it works", ar: "الخطوات" },
  tabReviews: { en: "Reviews", ar: "الآراء" },
  tabFaq: { en: "Questions", ar: "الأسئلة" },
  stepTypes: { en: "Choose your visa", ar: "اختر نوع التأشيرة" },
  stepTypesBody: { en: "Each type has its own stay, validity, and price. The visa card updates as you choose.", ar: "لكل نوع إقامته وصلاحيته وسعره. بطاقة التأشيرة تتغير مع اختيارك." },
  stepSpeed: { en: "Choose how fast", ar: "اختر السرعة" },
  stepSpeedBody: { en: "The date is when staff aim to have your visa ready.", ar: "التاريخ هو الموعد الذي يستهدف الفريق تجهيز تأشيرتك فيه." },
  stepDocs: { en: "Prepare these documents", ar: "جهّز هذه المستندات" },
  stepDocsBody: { en: "You upload them after you start. Staff check every file before filing.", ar: "ترفعها بعد بدء الطلب، ويراجع الفريق كل ملف قبل التقديم." },
  standard: { en: "Standard", ar: "عادي" },
  express: { en: "Express", ar: "سريع" },
  arrives: { en: "Ready by", ar: "جاهزة في" },
  included: { en: "Included", ar: "مشمول في السعر" },
  extra: { en: "+{fee}", ar: "+{fee}" },
  noExpress: { en: "Express is not offered for this visa type.", ar: "المعالجة السريعة غير متاحة لهذا النوع." },
  today: { en: "Today", ar: "اليوم" },
  visaReady: { en: "Visa ready", ar: "التأشيرة جاهزة" },
  whyMove: { en: "Why could the date move?", ar: "لماذا قد يتغير الموعد؟" },
  passType: { en: "Visa type", ar: "نوع التأشيرة" },
  passStay: { en: "Stay", ar: "الإقامة" },
  passValidity: { en: "Validity", ar: "الصلاحية" },
  passEntry: { en: "Entry", ar: "الدخول" },
  passTarget: { en: "Target date", ar: "الموعد المستهدف" },
  perTraveller: { en: "Per traveller", ar: "لكل مسافر" },
  embassyNote: { en: "You pay the government fee at the embassy. This price is the service only.", ar: "رسم الجهة يُدفع في السفارة. هذا السعر للخدمة فقط." },
  docsAll: { en: "That is the full list", ar: "هذه القائمة كاملة" },
  docsChanged: { en: "This visa type has its own list", ar: "لهذا النوع قائمة مستندات خاصة" },
  promiseReview: { en: "Staff check every file before it is filed", ar: "يراجع الفريق كل ملف قبل تقديمه" },
  promisePrice: { en: "The full price is shown before you pay", ar: "السعر الكامل يظهر قبل الدفع" },
  promiseTrack: { en: "Track every step from your account", ar: "تابع كل خطوة من حسابك" },
  approvedShare: { en: "of decided {name} applications were approved", ar: "من طلبات {name} المحسومة تمت الموافقة عليها" },
  reviewsCount: { en: "{n} reviews", ar: "{n} تقييمات" },
  stepsTitle: { en: "What happens after you start", ar: "ماذا يحدث بعد بدء الطلب" },
  nearbyTitle: { en: "Also near {name}", ar: "وجهات قريبة من {name}" },
  approvedNote: { en: "Past results on {brand}. Not a prediction or a guarantee.", ar: "نتائج سابقة على {brand}. ليست توقعاً ولا ضماناً." },
  rejectTitle: { en: "Common reasons for refusal", ar: "أسباب شائعة للرفض" },
  fromPrice: { en: "From {price}", ar: "من {price}" },
  sourcesCount: { en: "{n} official sources", ar: "{n} مصادر رسمية" },
  showSources: { en: "Show sources", ar: "عرض المصادر" },
  hideSources: { en: "Hide sources", ar: "إخفاء المصادر" },
  noResults: { en: "No question matches that search. Try a shorter word.", ar: "لا يوجد سؤال يطابق البحث. جرّب كلمة أقصر." },
  stickyTarget: { en: "Ready by {date}", ar: "جاهزة في {date}" },
} as const;

export type CopyKey = keyof typeof copy;

export function c(locale: string, key: CopyKey, vars: Record<string, string | number> = {}) {
  const entry = copy[key];
  let text: string = isArabicLocale(locale) ? entry.ar : entry.en;
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}
