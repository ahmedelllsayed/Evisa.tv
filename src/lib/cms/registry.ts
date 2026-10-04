export type CmsTemplate =
  | "on-time"
  | "partners"
  | "newsroom"
  | "contact"
  | "emergency"
  | "requirements"
  | "photo"
  | "passport"
  | "wall"
  | "refunds"
  | "status"
  | "fees"
  | "prose";

export type CmsField = { key: string; label: string; multiline?: boolean; hint?: string };

export const TEMPLATES: { id: CmsTemplate; label: string; fields: CmsField[] }[] = [
  {
    id: "on-time",
    label: "الضمان في الوقت",
    fields: [
      { key: "hero1", label: "السطر الأول" },
      { key: "hero2", label: "السطر الثاني" },
      { key: "heroBody", label: "فقرة البطل", multiline: true },
      { key: "band1Title", label: "عنوان القسم 1" },
      { key: "band1Body", label: "نص القسم 1", multiline: true },
      { key: "band2Title", label: "عنوان القسم 2" },
      { key: "band2Body", label: "نص القسم 2", multiline: true },
      { key: "band3Title", label: "عنوان القسم 3" },
      { key: "band3Body", label: "نص القسم 3", multiline: true },
      { key: "missedTitle", label: "عنوان التأخيرات" },
      { key: "missed1", label: "فقرة التأخير 1", multiline: true },
      { key: "missed2", label: "فقرة التأخير 2", multiline: true },
      { key: "cases", label: "حالات التأخير", multiline: true, hint: "سطر لكل حالة: الاسم | مدة التأخير | السبب" },
    ],
  },
  {
    id: "partners",
    label: "الشركاء",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "groups", label: "المجموعات", multiline: true, hint: "سطر: التصنيف | علامة، علامة" },
    ],
  },
  {
    id: "newsroom",
    label: "غرفة الأخبار",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "subtitle", label: "العنوان الفرعي" },
      { key: "posts", label: "الأخبار", multiline: true, hint: "سطر: التاريخ | المصدر | العنوان" },
    ],
  },
  {
    id: "contact",
    label: "التواصل",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "supportHeading", label: "عنوان الدعم" },
    ],
  },
  {
    id: "emergency",
    label: "الطوارئ",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "body", label: "النص", multiline: true },
      { key: "stats", label: "الأرقام", multiline: true, hint: "سطر: الرقم | الوصف" },
    ],
  },
  {
    id: "requirements",
    label: "متطلبات التأشيرة",
    fields: [
      { key: "kicker", label: "السطر العلوي" },
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
    ],
  },
  {
    id: "photo",
    label: "صانع الصور",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
    ],
  },
  {
    id: "passport",
    label: "مؤشر الجوازات",
    fields: [
      { key: "kicker", label: "السطر العلوي" },
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
    ],
  },
  {
    id: "wall",
    label: "جدار الحب",
    fields: [{ key: "title", label: "العنوان" }],
  },
  {
    id: "refunds",
    label: "الاسترداد",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "rows", label: "جدول الاسترداد", multiline: true, hint: "سطر: المرحلة | ماذا يحدث | الاسترداد | السبب" },
    ],
  },
  {
    id: "status",
    label: "الحالة",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "systems", label: "الأنظمة", multiline: true, hint: "سطر: الاسم | الحالة | وقت التشغيل" },
    ],
  },
  {
    id: "fees",
    label: "سجل الرسوم",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
    ],
  },
  {
    id: "prose",
    label: "صفحة نصية",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "body", label: "المحتوى", multiline: true, hint: "افصل الفقرات بسطر فارغ. ابدأ العنوان بـ ##" },
    ],
  },
];

export type CmsContent = Record<string, string>;

export const BUILTIN_PAGES: { slug: string; template: CmsTemplate; title: string; sortOrder: number; content: CmsContent }[] = [
  {
    slug: "on-time-guaranteed",
    template: "on-time",
    title: "On Time Guaranteed",
    sortOrder: 10,
    content: {
      hero1: "On Time",
      hero2: "Guaranteed",
      heroBody:
        "We have firsthand experience with the anxiety of the visa process.That's why we are committed to eliminating it for you.Based on your travel destination and the time of your application, we deliver your visa exactly as promised, and we guarantee it.",
      band1Title: "What happens on delay?",
      band1Body:
        "If we are unable to deliver your visa within the promised timeframe, we offer you a 100% refund. We also give you the visa when it arrives.",
      band2Title: "How do we calculate the timeframe?",
      band2Body:
        "We leverage data points from past visa timelines, insights from our PRO team, and factors such as seasonal variations and embassy holidays to provide you with an accurate timeframe for the delivery of your visa.",
      band3Title: "Checking status of visa",
      band3Body:
        "You can track the live status of your visa on Atlys while we ensure timely delivery. These real-time updates on your visa can help you see exactly where it is in the various stages of the application process.",
      missedTitle: "The time commitments we missed",
      missed1:
        "Our reasons for missing the On Time Guarantee vary. Some include not accounting for public holidays at your destination country, while others may be inefficiency in coordinating with embassies.",
      missed2:
        "When we delay, we take full responsibility. We understand the frustration when things go wrong, especially after making a guarantee.",
      cases: ["Supriya Gupta | Missed by 2 days | Singapore Passport Pickup Delay", "Aditya Gupta | Missed by 4 hrs | Vietnam Visa Correction", "Alok Joshi | Missed by 23 min | Oman Visa Public Holiday"].join("\n"),
    },
  },
  {
    slug: "partners",
    template: "partners",
    title: "Partners",
    sortOrder: 20,
    content: {
      title: "The brands\nwe travel with.",
      intro: "Airlines, banks, fintech, study, lifestyle. The companies that trust Atlys with their customers.",
      groups: ["Travel | MakeMyTrip, Air India, IndiGo BluChip, Nasher Miles", "Study Abroad | Career Mosaic, Leap Scholar", "Consumer Fintech | CheQ, OneCard, CRED, Tata Neu"].join("\n"),
    },
  },
  {
    slug: "newsroom",
    template: "newsroom",
    title: "Newsroom",
    sortOrder: 30,
    content: {
      title: "Newsroom",
      subtitle: "Media Features and Company Announcements",
      posts: [
        "27-07-2026 | ET Brand Equity | How Atlys is engineering certainty into the visa experience",
        "18-06-2026 | Fortune | How former Pinterest engineer Mohak Nahta is building travel's AI concierge",
        "28-04-2026 | Google Blog | Expanding digital IDs in India and around the world",
        "16-03-2026 | Business Standard | Atlys raises $36 mn to expand visa platform globally, invest in AI tools",
        "16-03-2026 | The Economic Times | Visa processing startup Atlys raises $36 million led by Susquehanna Asia VC",
        "16-03-2026 | Mint | Atlys secures $36 million in Series C funding from Susquehanna Asia VC",
        "11-02-2026 | The Economic Times | Atlys releases travel access report ranking 50 international destinations for Indian travellers",
        "23-10-2025 | Business Standard | Travel Plans? How you can earn 24K gold with every visa referral at Atlys",
      ].join("\n"),
    },
  },
  {
    slug: "contact",
    template: "contact",
    title: "Contact",
    sortOrder: 40,
    content: {
      title: "Get in touch",
      intro:
        "Thank you for your interest in reaching out to us! We value your feedback, inquiries, and suggestions. To ensure we can assist you effectively, please find the appropriate contact information and guidelines below:",
      supportHeading: "Customer support",
    },
  },
  {
    slug: "emergency-care",
    template: "emergency",
    title: "Emergency Helpline",
    sortOrder: 50,
    content: {
      title: "Emergency visa?\nwe're on it",
      body: "Crisis doesn't wait for paperwork. Talk to a visa specialist now and get your application moving.",
      stats: ["24/7 | Active Call Support", "50+ | Government Partners", "120+ | Countries Supported"].join("\n"),
    },
  },
  {
    slug: "tools/visa-requirements",
    template: "requirements",
    title: "Visa Requirements",
    sortOrder: 60,
    content: {
      kicker: "Visa checker · 200+ countries · updated daily",
      title: "Do I need a visa?",
      intro: "Pick your passport and your destination. We'll say whether you need a visa, what kind, how long it takes, and what it costs.",
    },
  },
  {
    slug: "tools/visa-photo-maker",
    template: "photo",
    title: "Visa Photo Creator",
    sortOrder: 70,
    content: {
      title: "Instantly Generate Photos for Every Document You Need",
      intro: "Studio-style photos for passports, visas and IDs, ready in a few minutes.",
    },
  },
  {
    slug: "passport-index",
    template: "passport",
    title: "Passport Index",
    sortOrder: 80,
    content: {
      kicker: "2026 passport power index · updated September 2026",
      title: "The world's most powerful passports",
      intro: "Compare passports by visa-free access, mobility score and global rank. Find one, study the rest, and plan the next trip.",
    },
  },
  {
    slug: "wall-of-love",
    template: "wall",
    title: "Wall of Love",
    sortOrder: 90,
    content: { title: "Wall of Love" },
  },
  {
    slug: "transparency/refunds-policy",
    template: "refunds",
    title: "Refunds Policy",
    sortOrder: 100,
    content: {
      title: "Refund Clarity You Can Count On",
      intro: "Every case is different. The stage of the application decides what comes back.",
      rows: [
        "Application submitted | Personal details still being added | Full refund | Nothing has been sent to the government yet.",
        "Documents under review | We are checking the file | Full refund | The application has not been filed.",
        "Filed with the government | Processing has started | No refund of the government fee | A filed application cannot be withdrawn.",
        "Decision issued | The visa was approved on time | No refund | The visa has already been issued.",
      ].join("\n"),
    },
  },
  {
    slug: "transparency/status",
    template: "status",
    title: "Status",
    sortOrder: 110,
    content: {
      title: "Atlys & Government Portal Systems Tracker",
      intro: "Whether this site and the government visa portals we file with are up, slow, or down.",
      systems: [
        "Atlys | Operational | 99.5%",
        "United Arab Emirates | Operational | 98%",
        "Australia | Operational | 97%",
        "Vietnam | Operational | 99%",
        "Türkiye | Operational | 98%",
        "United Kingdom | Operational | 96%",
        "Egypt | Operational | 99%",
      ].join("\n"),
    },
  },
  {
    slug: "transparency/price-change-log",
    template: "fees",
    title: "Fee Change Audit",
    sortOrder: 120,
    content: {
      title: "Every fee ever changed is right here.",
      intro: "With the date and the reason. You do not have to guess.",
    },
  },
  {
    slug: "privacy",
    template: "prose",
    title: "Privacy Policy",
    sortOrder: 130,
    content: {
      title: "Privacy Policy",
      intro: "Last updated: 1 May 2026. How we collect and use information when you apply for a visa on this website.",
      body: [
        "## 1. What we collect",
        "Account details (email, name, phone), application data (travellers, passport details, uploaded documents) and technical logs needed to keep the service secure.",
        "",
        "## 2. How we use it",
        "To create and process visa applications, take payment, send status updates, and improve the product. We do not sell personal information.",
        "",
        "## 3. Sharing",
        "Documents and traveller details are shared with the relevant government or visa authority so the application can be filed. Payment processors receive only what they need to charge the card.",
        "",
        "## 4. Retention",
        "Application files are kept for as long as needed to complete the visa and meet legal record-keeping duties, then deleted or anonymised.",
      ].join("\n"),
    },
  },
  {
    slug: "terms",
    template: "prose",
    title: "Terms and Conditions",
    sortOrder: 140,
    content: {
      title: "Terms and Conditions",
      intro: "Last updated: 28 March 2026. These terms govern use of the websites and the visa application service.",
      body: [
        "## 1. The service",
        "We help you prepare and file visa applications and show a guaranteed delivery date before you pay. Governments make the final decision on every visa.",
        "",
        "## 2. Your responsibilities",
        "You must provide accurate information and genuine documents. False or altered files can lead to refusal, cancellation without refund, and reporting to the relevant authority.",
        "",
        "## 3. Fees",
        "Government fees and our processing fee are listed before checkout. Refunds follow the published refunds policy for the stage the application has reached.",
      ].join("\n"),
    },
  },
  {
    slug: "rejection-recovery",
    template: "prose",
    title: "Rejection Recovery",
    sortOrder: 150,
    content: {
      title: "We don't cover this one yet.",
      intro: "Recovery isn't available for this destination in your region right now. Pick another country to see its rejection rate and recovery odds.",
      body: "",
    },
  },
];

export function templateFields(template: string): CmsField[] {
  return TEMPLATES.find((t) => t.id === template)?.fields ?? TEMPLATES.find((t) => t.id === "prose")!.fields;
}

export function defaultContent(slug: string, template: string): CmsContent {
  const builtin = BUILTIN_PAGES.find((p) => p.slug === slug);
  if (builtin) return { ...builtin.content };
  const empty: CmsContent = {};
  for (const field of templateFields(template)) empty[field.key] = "";
  if (template === "prose") {
    empty.title = "New page";
    empty.intro = "";
    empty.body = "";
  }
  return empty;
}

export function mergeContent(base: CmsContent, stored: CmsContent | null | undefined): CmsContent {
  const out = { ...base };
  if (!stored) return out;
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

export function linesOf(value: string | undefined): string[][] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()));
}

export const BUILTIN_SLUGS = new Set(BUILTIN_PAGES.map((p) => p.slug));
