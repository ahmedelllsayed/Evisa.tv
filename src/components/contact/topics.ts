export const CONTACT_TOPICS = ["status", "documents", "payment", "refund", "urgent", "partnership", "general"] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && (CONTACT_TOPICS as readonly string[]).includes(value);
}

type TopicCopy = {
  en: string;
  ar: string;
  /** Stored on the message; the admin inbox is Arabic and colours chips by these words. */
  inbox: string;
  helpEn: string;
  helpAr: string;
  placeholderEn: string;
  placeholderAr: string;
  links: { path: string; en: string; ar: string }[];
};

export const topicCopy: Record<ContactTopic, TopicCopy> = {
  status: {
    en: "Application status",
    ar: "حالة الطلب",
    inbox: "حالة الطلب",
    helpEn: "Your application page shows every update, what is still missing and the target date.",
    helpAr: "صفحة طلبك تعرض كل تحديث، وما ينقص الملف، والموعد المستهدف.",
    placeholderEn: "What do you see on your application page, and what did you expect?",
    placeholderAr: "ماذا يظهر في صفحة طلبك، وماذا كنت تتوقع؟",
    links: [
      { path: "/account", en: "My applications", ar: "طلباتي" },
      { path: "/transparency/status", en: "Service status", ar: "حالة الخدمة" },
    ],
  },
  documents: {
    en: "Documents",
    ar: "المستندات",
    inbox: "المستندات",
    helpEn: "Each visa page lists the documents we ask for. The photo tool checks size and background before you upload.",
    helpAr: "صفحة كل تأشيرة تعرض المستندات المطلوبة، وأداة الصور تضبط المقاس والخلفية قبل الرفع.",
    placeholderEn: "Which document, and what does the message on the upload say?",
    placeholderAr: "أي مستند؟ وماذا تقول الرسالة عند الرفع؟",
    links: [
      { path: "/tools/visa-requirements", en: "Visa requirements", ar: "متطلبات التأشيرة" },
      { path: "/tools/visa-photo-maker", en: "Photo tool", ar: "صورة التأشيرة" },
      { path: "/rejection-recovery", en: "Rejection notes", ar: "ملاحظات الرفض" },
    ],
  },
  payment: {
    en: "Payment",
    ar: "الدفع",
    inbox: "الدفع",
    helpEn: "The payment provider confirms each payment. If you paid and the application still says awaiting payment, open it again after a few minutes.",
    helpAr: "مزود الدفع هو من يؤكد العملية. إذا دفعت وما زال الطلب بانتظار الدفع، افتحه مرة أخرى بعد دقائق.",
    placeholderEn: "Your reference, the amount, and what the screen showed after paying.",
    placeholderAr: "رقم الطلب، والمبلغ، وما ظهر على الشاشة بعد الدفع.",
    links: [
      { path: "/account", en: "My applications", ar: "طلباتي" },
      { path: "/transparency/price-change-log", en: "Fee changes", ar: "سجل الرسوم" },
    ],
  },
  refund: {
    en: "Refund",
    ar: "الاسترداد",
    inbox: "الاسترداد",
    helpEn: "What comes back depends on how far the application went. Signed-in travellers can ask for a refund from the application page.",
    helpAr: "المبلغ المسترد يعتمد على مرحلة الطلب. يمكنك طلب الاسترداد من صفحة الطلب بعد تسجيل الدخول.",
    placeholderEn: "Your reference and why you want a refund.",
    placeholderAr: "رقم الطلب وسبب طلب الاسترداد.",
    links: [
      { path: "/transparency/refunds-policy", en: "Refunds policy", ar: "سياسة الاسترداد" },
      { path: "/account", en: "My applications", ar: "طلباتي" },
    ],
  },
  urgent: {
    en: "Urgent travel",
    ar: "سفر عاجل",
    inbox: "عاجل",
    helpEn: "Add your travel date and reference so staff can see how close the trip is.",
    helpAr: "اكتب موعد السفر ورقم الطلب ليعرف الفريق مدى قرب الرحلة.",
    placeholderEn: "What happened, when you travel, and what you need from us.",
    placeholderAr: "ماذا حدث، ومتى تسافر، وماذا تحتاج منا.",
    links: [{ path: "/emergency-care", en: "Emergency help", ar: "خط الطوارئ" }],
  },
  partnership: {
    en: "Partnership",
    ar: "شراكة",
    inbox: "شراكة",
    helpEn: "Tell us who you are, your audience, and what you have in mind.",
    helpAr: "عرّفنا بك وبجمهورك وبالفكرة التي تقترحها.",
    placeholderEn: "Company, website, and the idea in a few lines.",
    placeholderAr: "اسم الشركة، والموقع، والفكرة في سطور.",
    links: [],
  },
  general: {
    en: "Something else",
    ar: "استفسار عام",
    inbox: "استفسار عام",
    helpEn: "Visa rules for Egyptian passports, fees and documents are on each visa page.",
    helpAr: "قواعد التأشيرة للجواز المصري والرسوم والمستندات موجودة في صفحة كل تأشيرة.",
    placeholderEn: "How can we help?",
    placeholderAr: "كيف نساعدك؟",
    links: [
      { path: "/tools/visa-requirements", en: "Visa requirements", ar: "متطلبات التأشيرة" },
      { path: "/passport-index", en: "Passport index", ar: "مؤشر الجوازات" },
    ],
  },
};
