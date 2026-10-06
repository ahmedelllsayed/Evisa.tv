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
      hero1Ar: "في الموعد",
      hero2: "Guaranteed",
      hero2Ar: "المستهدف",
      heroBody:
        "We have firsthand experience with the anxiety of the visa process.That's why we are committed to eliminating it for you.Based on your travel destination and the time of your application, we deliver your visa exactly as promised, and we guarantee it.",
      heroBodyAr: "نعرف قلق إجراءات التأشيرة. التاريخ الظاهر قبل الدفع هدف للخدمة، ويراجعه فريق بشري. الجهة هي التي تصدر التأشيرة.",
      band1Title: "What happens on delay?",
      band1TitleAr: "ماذا يحدث عند التأخير؟",
      band1Body:
        "If the file is still open after the date we showed before payment, you can request a refund from your account. A staff member reviews it. The refund is not automatic, and the visa is not issued by this website.",
      band1BodyAr: "إذا بقي الملف مفتوحاً بعد التاريخ الظاهر قبل الدفع، يمكنك طلب استرداد من حسابك. يراجعه أحد الموظفين. الاسترداد ليس تلقائياً، والموقع لا يصدر التأشيرة.",
      band2Title: "How do we calculate the timeframe?",
      band2TitleAr: "كيف يُحسب الموعد؟",
      band2Body:
        "We leverage data points from past visa timelines, insights from our PRO team, and factors such as seasonal variations and embassy holidays to provide you with an accurate timeframe for the delivery of your visa.",
      band2BodyAr: "نعتمد على مدد سابقة وملاحظات الفريق وعطل السفارات لعرض موعد مستهدف. ليس وعداً من الجهة.",
      band3Title: "Checking status of visa",
      band3TitleAr: "متابعة حالة التأشيرة",
      band3Body:
        "Sign in and open the application to see the status our team sets. Updates are not a live feed from a government portal.",
      band3BodyAr: "سجّل الدخول وافتح الطلب لترى الحالة التي يضبطها الفريق. التحديثات ليست بثاً مباشراً من بوابة حكومية.",
      missedTitle: "The time commitments we missed",
      missedTitleAr: "المواعيد التي فاتت",
      missed1:
        "Our reasons for missing the On Time Guarantee vary. Some include not accounting for public holidays at your destination country, while others may be inefficiency in coordinating with embassies.",
      missed1Ar: "أسباب تجاوز الموعد تختلف. منها عطل بلد الوجهة، ومنها تأخر التنسيق مع السفارات.",
      missed2:
        "When we delay, we take full responsibility. We understand the frustration when things go wrong, especially after making a guarantee.",
      missed2Ar: "عند التأخير يراجع الفريق الملف. يمكنك طلب استرداد من الحساب إذا انطبق.",
      cases: "",
    },
  },
  {
    slug: "partners",
    template: "partners",
    title: "Partners",
    sortOrder: 20,
    content: {
      title: "The brands\nwe travel with.",
      titleAr: "العلامات\nالتي نسافر معها.",
      intro: "Partner names appear here only after an agreement is recorded. None are listed yet.",
      introAr: "تظهر أسماء الشركاء هنا بعد تسجيل اتفاق. لا توجد أسماء بعد.",
      groups: "",
    },
  },
  {
    slug: "newsroom",
    template: "newsroom",
    title: "Newsroom",
    sortOrder: 30,
    content: {
      title: "Newsroom",
      titleAr: "الأخبار",
      subtitle: "Announcements from this site",
      subtitleAr: "إعلانات من هذا الموقع",
      posts: "",
    },
  },
  {
    slug: "contact",
    template: "contact",
    title: "Contact",
    sortOrder: 40,
    content: {
      title: "Get in touch",
      titleAr: "تواصل معنا",
      intro:
        "Send a message with the form. It is stored for the admin team. Phone and email on this page are the addresses configured in settings.",
      introAr: "أرسل رسالة من النموذج. تُحفظ لفريق الإدارة. الهاتف والبريد الظاهران هنا هما ما تم ضبطه في الإعدادات.",
      supportHeading: "Customer support",
      supportHeadingAr: "الدعم",
    },
  },
  {
    slug: "emergency-care",
    template: "emergency",
    title: "Emergency Helpline",
    sortOrder: 50,
    content: {
      title: "Emergency visa?\nwe're on it",
      titleAr: "تأشيرة عاجلة؟\nالفريق يتابعها",
      body: "Crisis doesn't wait for paperwork. Talk to a visa specialist now and get your application moving.",
      bodyAr: "الحالة العاجلة لا تنتظر الأوراق. تواصل مع الفريق ليبدأ مراجعة الطلب.",
      stats: ["24/7 | Phone and email listed on this page", "Manual | Applications are reviewed by staff"].join("\n"),
      statsAr: ["على مدار الساعة | الهاتف والبريد الظاهران في هذه الصفحة", "يدوي | يراجع الموظفون الطلبات"].join("\n"),
    },
  },
  {
    slug: "tools/visa-requirements",
    template: "requirements",
    title: "Visa Requirements",
    sortOrder: 60,
    content: {
      kicker: "Visa checker · Egyptian passports",
      kickerAr: "فاحص التأشيرة · جوازات مصرية",
      title: "Do I need a visa?",
      titleAr: "هل أحتاج تأشيرة؟",
      intro: "The fees and rules on this site are for Egyptian passports. Pick a destination to see the visa type, the fee, and the documents we ask for. Tourism and business use the same catalog entry.",
      introAr: "الرسوم والقواعد هنا لجوازات مصرية. اختر وجهة لترى النوع والرسم والمستندات. السياحة والعمل يستخدمان نفس بيانات الوجهة.",
    },
  },
  {
    slug: "tools/visa-photo-maker",
    template: "photo",
    title: "Visa Photo Creator",
    sortOrder: 70,
    content: {
      title: "Instantly Generate Photos for Every Document You Need",
      titleAr: "جهّز صورة لكل مستند تحتاجه",
      intro: "Studio-style photos for passports, visas and IDs, ready in a few minutes.",
      introAr: "صور بأسلوب الاستوديو للجواز والتأشيرة والهوية، خلال دقائق.",
    },
  },
  {
    slug: "passport-index",
    template: "passport",
    title: "Passport Index",
    sortOrder: 80,
    content: {
      kicker: "2026 passport power index · updated September 2026",
      kickerAr: "مؤشر قوة الجوازات 2026 · محدّث في سبتمبر 2026",
      title: "The world's most powerful passports",
      titleAr: "أقوى جوازات السفر",
      intro: "Compare passports by visa-free access, mobility score and global rank. Find one, study the rest, and plan the next trip.",
      introAr: "قارن الجوازات حسب الدخول بدون تأشيرة والنقاط والترتيب. اختر واحداً وخطط للرحلة التالية.",
    },
  },
  {
    slug: "wall-of-love",
    template: "wall",
    title: "Wall of Love",
    sortOrder: 90,
    content: { title: "Wall of Love", titleAr: "آراء المسافرين" },
  },
  {
    slug: "transparency/refunds-policy",
    template: "refunds",
    title: "Refunds Policy",
    sortOrder: 100,
    content: {
      title: "Refunds",
      titleAr: "الاسترداد",
      intro: "A refund is a request you send from your account. Staff approve it before any card is refunded. Filing with an authority is a manual status, not an automatic submission.",
      introAr: "الاسترداد طلب ترسله من حسابك. يوافق عليه الموظف قبل إعادة أي مبلغ. حالة «مقدَّم» يضبطها شخص، وليست إرسالاً تلقائياً.",
      rows: [
        "Paid, not marked filed | Staff are still reviewing | Refund can be requested | Nothing has been marked filed.",
        "Marked filed | A person set the status to filed | No automatic refund | Ask support if the file should be reviewed.",
        "Approved | The issued file was uploaded | No refund | The document is already in your account.",
        "Rejected | The application was refused | Request a review | A refusal does not refund the fee by itself.",
      ].join("\n"),
      rowsAr: [
        "مدفوع ولم يُعلَّم كمقدَّم | الفريق ما زال يراجع | يمكن طلب الاسترداد | لم تُضبط حالة التقديم.",
        "مُعلَّم كمقدَّم | ضبط موظف الحالة | لا استرداد تلقائي | اطلب من الدعم مراجعة الملف.",
        "موافق عليه | رُفع ملف التأشيرة | لا استرداد | المستند موجود في حسابك.",
        "مرفوض | رُفض الطلب | اطلب مراجعة | الرفض وحده لا يعيد الرسم.",
      ].join("\n"),
    },
  },
  {
    slug: "transparency/status",
    template: "status",
    title: "Status",
    sortOrder: 110,
    content: {
      title: "Service status",
      titleAr: "حالة الخدمة",
      intro: "These lines are notes maintained by the operator. They are not a live monitor of this website or of any government portal.",
      introAr: "هذه الأسطر ملاحظات يحدّثها المشغّل. ليست مراقبة مباشرة للموقع ولا لأي بوابة حكومية.",
      systems: ["Website | Maintained manually | Not a live uptime probe"].join("\n"),
      systemsAr: ["الموقع | يُحدَّث يدوياً | ليس فحص تشغيل مباشر"].join("\n"),
    },
  },
  {
    slug: "transparency/price-change-log",
    template: "fees",
    title: "Fee Change Audit",
    sortOrder: 120,
    content: {
      title: "Every fee ever changed is right here.",
      titleAr: "كل تغيير في الرسوم موجود هنا.",
      intro: "With the date and the reason. You do not have to guess.",
      introAr: "مع التاريخ والسبب. لا حاجة للتخمين.",
    },
  },
  {
    slug: "privacy",
    template: "prose",
    title: "Privacy Policy",
    sortOrder: 130,
    content: {
      title: "Privacy Policy",
      titleAr: "سياسة الخصوصية",
      intro: "Last updated: 1 May 2026. How we collect and use information when you apply for a visa on this website.",
      introAr: "آخر تحديث: 1 مايو 2026. كيف نجمع المعلومات ونستخدمها عند تقديم طلب تأشيرة على هذا الموقع.",
      body: [
        "## 1. What we collect",
        "Account details (email, name, phone), application data (travellers, passport details, uploaded documents) and technical logs needed to keep the service secure.",
        "",
        "## 2. How we use it",
        "To create and process visa applications, take payment, send status updates, and improve the product. We do not sell personal information.",
        "",
        "## 3. Sharing",
        "Documents stay on this site for our team to review. They are sent to an authority only when a person files the application outside this automatic flow. Payment processors receive only what they need to charge the card.",
        "",
        "## 4. Retention",
        "Application files are kept for as long as needed to complete the visa and meet legal record-keeping duties, then deleted or anonymised.",
      ].join("\n"),
      bodyAr: [
        "## 1. ماذا نجمع",
        "بيانات الحساب (البريد والاسم والهاتف)، وبيانات الطلب (المسافرون وبيانات الجواز والملفات)، وسجلات تقنية لازمة لأمان الخدمة.",
        "",
        "## 2. كيف نستخدمها",
        "لإنشاء طلبات التأشيرة ومعالجتها واستلام الدفع وإرسال تحديثات الحالة. لا نبيع البيانات الشخصية.",
        "",
        "## 3. المشاركة",
        "تبقى المستندات على هذا الموقع ليراجعها الفريق. تُرسل إلى جهة فقط عندما يقدّمها شخص خارج هذا المسار التلقائي. يتلقى معالج الدفع ما يلزم لخصم البطاقة فقط.",
        "",
        "## 4. الاحتفاظ",
        "تُحفظ ملفات الطلب للمدة اللازمة لإكمال التأشيرة والالتزامات القانونية، ثم تُحذف أو تُجهَّل.",
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
      titleAr: "الشروط والأحكام",
      intro: "Last updated: 28 March 2026. These terms govern use of the websites and the visa application service.",
      introAr: "آخر تحديث: 28 مارس 2026. تحكم هذه الشروط استخدام الموقع وخدمة طلب التأشيرة.",
      body: [
        "## 1. The service",
        "We help you prepare a visa application and show a target date before you pay. A person on our team reviews the file and can mark it filed. The destination authority makes the visa decision. This website does not submit the application to a government portal by itself.",
        "",
        "## 2. Your responsibilities",
        "You must provide accurate information and genuine documents. False or altered files can lead to refusal, cancellation without refund, and reporting to the relevant authority.",
        "",
        "## 3. Fees",
        "Government fees and our processing fee are listed before checkout. Refunds follow the published refunds policy for the stage the application has reached.",
      ].join("\n"),
      bodyAr: [
        "## 1. الخدمة",
        "نساعدك في تجهيز طلب التأشيرة ونعرض تاريخاً مستهدفاً قبل الدفع. يراجع أحد الفريق الملف ويمكنه تعليمه كمقدَّم. قرار التأشيرة للجهة. هذا الموقع لا يرسل الطلب إلى بوابة حكومية بنفسه.",
        "",
        "## 2. مسؤولياتك",
        "يجب أن تقدّم معلومات صحيحة ومستندات أصلية. الملفات المزورة قد تؤدي إلى الرفض أو الإلغاء دون استرداد.",
        "",
        "## 3. الرسوم",
        "رسم الجهة ورسم الخدمة ظاهران قبل الدفع. الاسترداد يتبع سياسة الاسترداد المنشورة حسب مرحلة الطلب.",
      ].join("\n"),
    },
  },
  {
    slug: "rejection-recovery",
    template: "prose",
    title: "Rejection Recovery",
    sortOrder: 150,
    content: {
      title: "Rejection recovery is not offered",
      intro: "This site does not recover a refused visa automatically. A destination page shows rejection notes only when they have been entered for that country.",
      titleAr: "لا توجد استعادة تلقائية للرفض",
      introAr: "الموقع لا يسترد تأشيرة مرفوضة تلقائياً. ملاحظات الرفض تظهر في صفحة الوجهة فقط إذا أدخلها فريق التشغيل.",
      body: "",
    },
  },
  {
    slug: "editorial-policy",
    template: "prose",
    title: "Editorial policy",
    sortOrder: 160,
    content: {
      title: "Editorial policy",
      titleAr: "السياسة التحريرية",
      intro: "How destination pages are written.",
      introAr: "كيف تُكتب صفحات الوجهات.",
      body: "Visa requirements on this site are taken from primary government sources: the immigration service, the foreign ministry, or the official electronic visa portal. Travel blogs and other agencies are not used as sources.\n\nEach destination can list the official pages that were checked. A link is included only when it points at that authority. Fees are the government charge plus the service fee. They change when an editor updates them.\n\nThe pages are written for Egyptian passports. A different citizenship should be confirmed on the government site.\n\nThe updated time on a destination is the last time that record was saved.",
      bodyAr: "متطلبات التأشيرة في هذا الموقع مأخوذة من مصادر حكومية أولية: جهة الهجرة أو وزارة الخارجية أو بوابة التأشيرة الرسمية. لا تُستخدم مدونات السفر كمصدر.\n\nيمكن لكل وجهة أن تعرض الصفحات الرسمية التي تمت مراجعتها. الرسوم هي رسم الجهة مضافاً إليه رسم الخدمة، وتتغير عندما يحدّثها المحرر.\n\nالصفحات مكتوبة لجواز السفر المصري. إذا كانت الجنسية مختلفة، فالموقع الحكومي هو مكان التأكد.\n\nوقت التحديث على الوجهة هو آخر مرة حُفظ فيها السجل.",
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
