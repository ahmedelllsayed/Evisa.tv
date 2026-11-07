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
  | "events"
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
      { key: "calcSteps", label: "خطوات حساب الموعد", multiline: true, hint: "سطر لكل خطوة: العنوان | الشرح" },
      { key: "lateSteps", label: "خطوات ما بعد التأخير", multiline: true, hint: "سطر لكل خطوة: العنوان | الشرح" },
      { key: "ctaTitle", label: "عنوان الدعوة الأخيرة" },
      { key: "ctaBody", label: "نص الدعوة الأخيرة", multiline: true },
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
      { key: "formHeading", label: "عنوان النموذج" },
      { key: "responseTime", label: "وقت الرد المتوقع", multiline: true, hint: "يظهر بجانب زر الإرسال. لا تكتب مدة لا يلتزم بها الفريق." },
    ],
  },
  {
    id: "emergency",
    label: "الطوارئ",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "body", label: "النص", multiline: true },
      { key: "stats", label: "الأرقام", multiline: true, hint: "سطر: الرقم | الوصف" },
      { key: "criteria", label: "ما يُعد عاجلاً", multiline: true, hint: "سطر: العنوان | الشرح" },
      { key: "ready", label: "جهّز قبل التواصل", multiline: true, hint: "سطر لكل عنصر" },
      { key: "expectations", label: "ماذا يحدث بعد الطلب", multiline: true, hint: "سطر: العنوان | الشرح" },
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
    fields: [
      { key: "kicker", label: "السطر العلوي" },
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "ctaTitle", label: "عنوان الدعوة" },
      { key: "ctaBody", label: "نص الدعوة", multiline: true },
    ],
  },
  {
    id: "refunds",
    label: "الاسترداد",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "rows", label: "جدول الاسترداد", multiline: true, hint: "سطر: المرحلة | ماذا يحدث | الاسترداد | السبب | yes أو no أو review أو none (اختياري) | حالات الحساب مثل submitted,in_review (اختياري)" },
      { key: "pickerTitle", label: "عنوان أداة «أين طلبي؟»" },
      { key: "pickerHint", label: "شرح الأداة", multiline: true },
      { key: "faq", label: "أسئلة احتياطية", multiline: true, hint: "تظهر إذا لم توجد أسئلة استرداد في قسم الأسئلة. سطر: السؤال | الجواب" },
      { key: "ctaTitle", label: "عنوان الدعوة الأخيرة" },
      { key: "ctaBody", label: "نص الدعوة الأخيرة", multiline: true },
    ],
  },
  {
    id: "status",
    label: "الحالة",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "systems", label: "ملاحظات المشغّل", multiline: true, hint: "سطر: الاسم | الحالة | ملاحظة. لا تكتب نسب تشغيل غير مقيسة." },
      { key: "liveIntro", label: "مقدمة الفحوص المباشرة", multiline: true },
      { key: "notice", label: "إشعار عام (اختياري)", multiline: true, hint: "يظهر أعلى الصفحة، مثل صيانة مجدولة. اتركه فارغاً لإخفائه." },
      { key: "notesTitle", label: "عنوان ملاحظات المشغّل" },
    ],
  },
  {
    id: "fees",
    label: "سجل الرسوم",
    fields: [
      { key: "title", label: "العنوان" },
      { key: "intro", label: "المقدمة", multiline: true },
      { key: "note", label: "ملاحظة عن الرسوم", multiline: true, hint: "تظهر بجانب السجل، مثل مكوّنات الرسم." },
    ],
  },
  {
    id: "events",
    label: "الفعاليات",
    fields: [
      { key: "kicker", label: "السطر العلوي" },
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
      hero2: "On Target",
      hero2Ar: "المستهدف",
      heroBody:
        "Before you pay, every application shows a target date. It comes from the processing time of the visa type you pick, a person on our team works to meet it, and the destination authority makes the visa decision.",
      heroBodyAr: "نعرف قلق إجراءات التأشيرة. التاريخ الظاهر قبل الدفع هدف للخدمة، ويراجعه فريق بشري. الجهة هي التي تصدر التأشيرة.",
      band1Title: "What happens on delay?",
      band1TitleAr: "ماذا يحدث عند التأخير؟",
      band1Body:
        "If the file is still open after the date we showed before payment, you can request a refund from your account. A staff member reviews it. The refund is not automatic, and the visa is not issued by this website.",
      band1BodyAr: "إذا بقي الملف مفتوحاً بعد التاريخ الظاهر قبل الدفع، يمكنك طلب استرداد من حسابك. يراجعه أحد الموظفين. الاسترداد ليس تلقائياً، والموقع لا يصدر التأشيرة.",
      band2Title: "How do we calculate the timeframe?",
      band2TitleAr: "كيف يُحسب الموعد؟",
      band2Body:
        "Each visa type has a processing time set by our team from past applications. The target date is that time counted from the moment your payment is confirmed. It is a service target, not a promise from the authority.",
      band2BodyAr: "لكل نوع تأشيرة مدة معالجة يحددها الفريق من الطلبات السابقة. الموعد المستهدف هو هذه المدة محسوبة من لحظة تأكيد الدفع. هو هدف للخدمة، وليس وعداً من الجهة.",
      band3Title: "Checking status of visa",
      band3TitleAr: "متابعة حالة التأشيرة",
      band3Body:
        "Sign in and open the application to see the status our team sets. Updates are not a live feed from a government portal.",
      band3BodyAr: "سجّل الدخول وافتح الطلب لترى الحالة التي يضبطها الفريق. التحديثات ليست بثاً مباشراً من بوابة حكومية.",
      missedTitle: "The time commitments we missed",
      missedTitleAr: "المواعيد التي فاتت",
      missed1:
        "Target dates are missed for different reasons: a public holiday at the destination, a slow authority, or a delay on our side.",
      missed1Ar: "أسباب تجاوز الموعد تختلف. منها عطل بلد الوجهة، ومنها تأخر التنسيق مع السفارات.",
      missed2:
        "When we are late, the team reviews the file, and you can request a refund from your account if it applies.",
      missed2Ar: "عند التأخير يراجع الفريق الملف. يمكنك طلب استرداد من الحساب إذا انطبق.",
      cases: "",
      calcSteps: [
        "You pick the visa type | Each type has a processing time, and express has a shorter one. Both are shown on the visa page before you pay.",
        "The clock starts at payment | The target date is the processing time counted from the moment your payment is confirmed, weekends included.",
        "Check holidays first | Public holidays at the destination are listed on the visa page. The authority may close on those days, so plan around them.",
      ].join("\n"),
      calcStepsAr: [
        "تختار نوع التأشيرة | لكل نوع مدة معالجة، وللمستعجل مدة أقصر. تظهر المدتان في صفحة التأشيرة قبل الدفع.",
        "يبدأ العد عند الدفع | الموعد المستهدف هو مدة المعالجة محسوبة من لحظة تأكيد الدفع، بما فيها أيام العطلة الأسبوعية.",
        "راجع العطل أولاً | عطل بلد الوجهة معروضة في صفحة التأشيرة. قد تغلق الجهة فيها، فخطّط على أساسها.",
      ].join("\n"),
      lateSteps: [
        "The target date passes | Your application is still open after the date saved in your account. The team sees it in the late queue.",
        "Request a refund | Open the application in your account and send a refund request with a short reason.",
        "A person decides | A staff member reviews the request. If it is approved, the card refund can take a few working days.",
      ].join("\n"),
      lateStepsAr: [
        "يمر الموعد المستهدف | يبقى طلبك مفتوحاً بعد التاريخ المحفوظ في حسابك، ويظهر للفريق ضمن الطلبات المتأخرة.",
        "اطلب الاسترداد | افتح الطلب من حسابك وأرسل طلب استرداد مع سبب قصير.",
        "يقرر موظف | يراجع أحد الموظفين الطلب. إذا وافق، قد يستغرق رد المبلغ إلى البطاقة بضعة أيام عمل.",
      ].join("\n"),
      ctaTitle: "Your target date is in your account",
      ctaTitleAr: "موعدك المستهدف في حسابك",
      ctaBody: "Sign in to see the date, the latest status from our team, and the refund request if it applies.",
      ctaBodyAr: "سجّل الدخول لترى التاريخ وآخر حالة من الفريق، وطلب الاسترداد إذا انطبق.",
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
      intro: "Pick a topic to see the quickest answer first. If you still need us, send a message and a staff member will reply by email.",
      introAr: "اختر موضوع رسالتك لترى أسرع إجابة أولاً. وإن احتجت إلينا، أرسل رسالتك وسيرد عليك أحد أفراد الفريق بالبريد.",
      supportHeading: "Other ways to reach us",
      supportHeadingAr: "طرق تواصل أخرى",
      formHeading: "Send us a message",
      formHeadingAr: "أرسل رسالتك",
      responseTime: "A person reads every message and replies by email.",
      responseTimeAr: "يقرأ أحد أفراد الفريق كل رسالة ويرد عليك بالبريد.",
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
      stats: "Manual | Every urgent request is read by staff",
      statsAr: "يدوي | يقرأ الفريق كل طلب عاجل",
      criteria: [
        "Your trip is days away | The visa is not issued yet and the departure date is close.",
        "A document was rejected | Staff asked for a new photo or passport scan and time is short.",
        "Paid, but nothing moved | You were charged and the application still shows awaiting payment.",
        "Wrong details on a visa | A name, passport number or date does not match your passport.",
      ].join("\n"),
      criteriaAr: [
        "موعد السفر بعد أيام | التأشيرة لم تصدر بعد وموعد المغادرة قريب.",
        "رُفض أحد المستندات | طلب الفريق صورة أو نسخة جواز جديدة والوقت ضيق.",
        "دفعت ولم يتحرك الطلب | خُصم المبلغ وما زال الطلب بانتظار الدفع.",
        "بيانات خاطئة في التأشيرة | الاسم أو رقم الجواز أو التاريخ لا يطابق جوازك.",
      ].join("\n"),
      ready: ["Your application reference (starts with ATL-)", "Your travel date", "The passport you applied with", "What changed, in one or two lines"].join("\n"),
      readyAr: ["رقم الطلب (يبدأ بـ ATL-)", "موعد السفر", "الجواز الذي قدّمت به", "ما الذي تغيّر، في سطر أو سطرين"].join("\n"),
      expectations: [
        "You send the details | Use the form on this page or a channel listed here.",
        "Staff review the file | A person checks what is missing and what can be done.",
        "The authority decides | The visa and its timing are decided by the issuing country, not by this site.",
      ].join("\n"),
      expectationsAr: [
        "ترسل التفاصيل | من النموذج في هذه الصفحة أو من وسائل التواصل الظاهرة هنا.",
        "يراجع الفريق الملف | يتأكد أحد الموظفين مما ينقص وما يمكن فعله.",
        "الجهة المختصة تقرر | قرار التأشيرة وتوقيته للدولة المصدِرة، لا لهذا الموقع.",
      ].join("\n"),
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
    content: {
      kicker: "In their own words",
      kickerAr: "بكلماتهم",
      title: "Wall of Love",
      titleAr: "آراء المسافرين",
      intro: "What travellers say after getting their visa with us. Reviews appear as written; examples are marked and never counted in the rating.",
      introAr: "ما يقوله المسافرون بعد استلام تأشيراتهم معنا. ننشر الآراء كما كُتبت، والأمثلة عليها علامة ولا تدخل في التقييم.",
      ctaTitle: "Your next trip starts here",
      ctaTitleAr: "رحلتك القادمة تبدأ هنا",
      ctaBody: "See the fee, the documents and the target date before you pay.",
      ctaBodyAr: "اعرف الرسوم والمستندات والموعد المستهدف قبل الدفع.",
    },
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
        "Not paid yet | The application is a draft or waiting for payment | Nothing to refund | No money has been taken. You can leave it or finish it later. | none | draft,payment_pending",
        "Paid, not marked filed | Staff are still reviewing | Refund can be requested | Nothing has been marked filed. | yes | submitted,in_review",
        "Marked filed | A person set the status to filed | No automatic refund | Ask support if the file should be reviewed. | review | filed",
        "Approved | The issued file was uploaded | No refund | The document is already in your account. | no | approved",
        "Rejected | The application was refused | Request a review | A refusal does not refund the fee by itself. | review | rejected",
      ].join("\n"),
      rowsAr: [
        "لم يُدفع بعد | الطلب مسودة أو بانتظار الدفع | لا يوجد ما يُسترد | لم يُخصم أي مبلغ. يمكنك تركه أو إكماله لاحقاً. | none | draft,payment_pending",
        "مدفوع ولم يُعلَّم كمقدَّم | الفريق ما زال يراجع | يمكن طلب الاسترداد | لم تُضبط حالة التقديم. | yes | submitted,in_review",
        "مُعلَّم كمقدَّم | ضبط موظف الحالة | لا استرداد تلقائي | اطلب من الدعم مراجعة الملف. | review | filed",
        "موافق عليه | رُفع ملف التأشيرة | لا استرداد | المستند موجود في حسابك. | no | approved",
        "مرفوض | رُفض الطلب | اطلب مراجعة | الرفض وحده لا يعيد الرسم. | review | rejected",
      ].join("\n"),
      pickerTitle: "Where is your application?",
      pickerTitleAr: "أين طلبك الآن؟",
      pickerHint: "Pick the stage shown in your account to see what happens and whether you can ask for a refund.",
      pickerHintAr: "اختر المرحلة الظاهرة في حسابك لترى ما يحدث، وهل يمكنك طلب الاسترداد.",
      faq: [
        "How do I request a refund? | Sign in, open the application in your account, and send a refund request with a short reason. A staff member reviews it.",
        "Is the refund automatic? | No. Every request is reviewed by a person before any money is sent back.",
        "How long does a card refund take? | After approval, it depends on the payment provider and can take several working days.",
        "Does a rejection refund the fee? | Not by itself. You can request a review from your account, and the team decides.",
      ].join("\n"),
      faqAr: [
        "كيف أطلب الاسترداد؟ | سجّل الدخول وافتح الطلب من حسابك، ثم أرسل طلب استرداد مع سبب قصير. يراجعه أحد الموظفين.",
        "هل الاسترداد تلقائي؟ | لا. يراجع شخص كل طلب قبل إعادة أي مبلغ.",
        "كم يستغرق رد المبلغ إلى البطاقة؟ | بعد الموافقة يعتمد على مزود الدفع، وقد يستغرق بضعة أيام عمل.",
        "هل يعيد الرفض الرسوم؟ | ليس وحده. يمكنك طلب مراجعة من حسابك، والفريق يقرر.",
      ].join("\n"),
      ctaTitle: "Refund requests are sent from your account",
      ctaTitleAr: "طلب الاسترداد يُرسل من حسابك",
      ctaBody: "Open the application, write a short reason, and a staff member will reply there.",
      ctaBodyAr: "افتح الطلب واكتب سبباً قصيراً، وسيرد عليك أحد الموظفين هناك.",
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
      systems: ["Government portals | Not monitored | Staff file applications by hand, so a portal outage shows up as a delay in your account."].join("\n"),
      systemsAr: ["بوابات الجهات | غير مراقَبة | يقدّم الفريق الطلبات يدوياً، لذا يظهر تعطل أي بوابة كتأخير في حسابك."].join("\n"),
      liveIntro: "The checks below run on our server every time this page opens. They show what works right now, not a history.",
      liveIntroAr: "الفحوص التالية تعمل على خادمنا في كل مرة تُفتح فيها الصفحة. تُظهر ما يعمل الآن، وليست سجلاً سابقاً.",
      notice: "",
      notesTitle: "Notes from the team",
      notesTitleAr: "ملاحظات الفريق",
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
      note: "A total is the government fee plus our service fee for one traveller. The price you see before paying is locked when the payment is confirmed, so a later change does not affect a paid application.",
      noteAr: "الإجمالي هو رسم الجهة مع رسم الخدمة لمسافر واحد. السعر الظاهر قبل الدفع يُثبَّت عند تأكيد الدفع، فلا يؤثر أي تغيير لاحق على طلب مدفوع.",
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
        "",
        "## 5. Cookies and analytics",
        "If you accept cookies, the site loads Google Analytics 4 to count visits and application steps. The choice is stored in a cookie. You can refuse and the site still works. Payment data is not sent to analytics.",
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
        "",
        "## 5. الكوكيز والتحليلات",
        "إذا وافقت على الكوكيز يحمّل الموقع Google Analytics 4 لعدّ الزيارات وخطوات الطلب. يُحفظ الاختيار في كوكي. يمكنك الرفض ويبقى الموقع يعمل. لا تُرسل بيانات الدفع إلى التحليلات.",
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
      title: "Why visas get refused",
      intro: "The common refusal reasons for each destination, and what to fix before you apply again. The decision belongs to the issuing authority; this site cannot reverse a refusal.",
      titleAr: "لماذا تُرفض التأشيرة؟",
      introAr: "أشهر أسباب الرفض لكل وجهة، وما الذي تصلحه قبل أن تقدّم من جديد. القرار للجهة المختصة، والموقع لا يستطيع إلغاء الرفض.",
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
      body: [
        "## 1. Where the rules come from",
        "Visa requirements on this site are taken from primary government sources: the immigration service, the foreign ministry, or the official electronic visa portal. Travel blogs and other agencies are not used as sources.",
        "",
        "## 2. Official links",
        "Each destination can list the official pages that were checked. A link is included only when it points at that authority.",
        "",
        "## 3. Fees",
        "Fees are the government charge plus the service fee. They change when an editor updates them, and changes are listed in the fee change log.",
        "",
        "## 4. Who the pages are for",
        "The pages are written for Egyptian passports. A different citizenship should be confirmed on the government site.",
        "",
        "## 5. Updates and corrections",
        "The updated time on a destination is the last time that record was saved. If you spot an error, send it from the contact page with a link to the page.",
      ].join("\n"),
      bodyAr: [
        "## 1. من أين تأتي المتطلبات",
        "متطلبات التأشيرة في هذا الموقع مأخوذة من مصادر حكومية أولية: جهة الهجرة أو وزارة الخارجية أو بوابة التأشيرة الرسمية. لا تُستخدم مدونات السفر أو الوكالات الأخرى كمصدر.",
        "",
        "## 2. الروابط الرسمية",
        "يمكن لكل وجهة أن تعرض الصفحات الرسمية التي تمت مراجعتها. لا نضع رابطاً إلا إذا كان يخص تلك الجهة.",
        "",
        "## 3. الرسوم",
        "الرسوم هي رسم الجهة مضافاً إليه رسم الخدمة. تتغير عندما يحدّثها المحرر، وتظهر التغييرات في سجل الرسوم.",
        "",
        "## 4. لمن كُتبت الصفحات",
        "الصفحات مكتوبة لجواز السفر المصري. إذا كانت الجنسية مختلفة، فالموقع الحكومي هو مكان التأكد.",
        "",
        "## 5. التحديث والتصحيح",
        "وقت التحديث على الوجهة هو آخر مرة حُفظ فيها السجل. إذا وجدت خطأ، أرسله من صفحة التواصل مع رابط الصفحة.",
      ].join("\n"),
    },
  },
  {
    slug: "security",
    template: "prose",
    title: "Security",
    sortOrder: 170,
    content: {
      title: "How we protect your data",
      titleAr: "كيف نحمي بياناتك",
      intro: "Passports and personal documents are sensitive. This page explains, in plain words, how they are stored, who can open them, and how to report a problem.",
      introAr: "الجوازات والمستندات الشخصية بيانات حساسة. توضح هذه الصفحة ببساطة كيف تُحفظ، ومن يمكنه فتحها، وكيف تبلغنا عن مشكلة.",
      body: [
        "## 1. Where your files live",
        "Uploaded passports, photos and issued visas are stored on Evisa's own servers, in the same database as your application. They are not copied to an outside file-sharing or storage service.",
        "",
        "## 2. Who can open them",
        "Only you and the staff working on applications can open a file. Every time a staff member opens one, the access is logged. Each staff role sees only what it needs.",
        "",
        "## 3. Signing in",
        "There are no passwords to leak. You sign in with a one-time code sent to your email, and repeated attempts are limited to stop guessing.",
        "",
        "## 4. Checking uploads",
        "Every upload is checked by its real content, not just its name, and must be a JPG, PNG, WebP or PDF under 10 MB. Anything else is refused.",
        "",
        "## 5. Payments",
        "Card details are entered on the payment provider's page. This site never sees or stores your full card number.",
        "",
        "## 6. Retention",
        "Passport files are kept only as long as needed to finish the application and meet record-keeping duties, then deleted or anonymised.",
        "",
        "## 7. Report a problem",
        "If you think you found a security issue, email the support address on the contact page with the details. Please do not test with other people's data. We reply to every report.",
      ].join("\n"),
      bodyAr: [
        "## 1. أين تُحفظ ملفاتك",
        "تُحفظ الجوازات والصور والتأشيرات الصادرة على خوادم Evisa نفسها، في نفس قاعدة بيانات طلبك. لا تُنسخ إلى أي خدمة خارجية لتخزين الملفات أو مشاركتها.",
        "",
        "## 2. من يمكنه فتحها",
        "لا يفتح الملف إلا أنت والموظفون الذين يعملون على الطلبات. كل فتح لملف من موظف يُسجَّل، وكل دور يرى ما يحتاجه فقط.",
        "",
        "## 3. تسجيل الدخول",
        "لا توجد كلمات مرور قابلة للتسريب. تدخل برمز لمرة واحدة يصل إلى بريدك، وتُقيَّد المحاولات المتكررة لمنع التخمين.",
        "",
        "## 4. فحص الملفات المرفوعة",
        "يُفحص كل ملف بمحتواه الحقيقي لا باسمه فقط، ويجب أن يكون JPG أو PNG أو WebP أو PDF وأقل من 10 ميجابايت. أي ملف آخر يُرفض.",
        "",
        "## 5. الدفع",
        "تُدخل بيانات البطاقة في صفحة مزود الدفع. هذا الموقع لا يرى رقم بطاقتك كاملاً ولا يحفظه.",
        "",
        "## 6. مدة الاحتفاظ",
        "تُحفظ ملفات الجواز للمدة اللازمة لإنهاء الطلب والتزامات حفظ السجلات فقط، ثم تُحذف أو تُجهَّل.",
        "",
        "## 7. الإبلاغ عن مشكلة",
        "إذا وجدت ثغرة أمنية، راسل بريد الدعم الظاهر في صفحة التواصل مع التفاصيل. نرجو عدم التجربة على بيانات أشخاص آخرين. نرد على كل بلاغ.",
      ].join("\n"),
    },
  },
  {
    slug: "events",
    template: "events",
    title: "Events",
    sortOrder: 180,
    content: {
      kicker: "Plan the trip around the moment",
      kickerAr: "خطّط رحلتك حول الحدث",
      title: "Events worth travelling for",
      titleAr: "فعاليات تستحق السفر",
      intro: "Festivals, races and shows coming up around the world, with the visa you need and when to apply so it arrives in time.",
      introAr: "مهرجانات وسباقات وعروض قادمة حول العالم، مع التأشيرة التي تحتاجها ومتى تقدّم لتصلك في الوقت.",
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
