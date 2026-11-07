"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { adminSaveSettingsForm } from "@/app/actions/admin";
import { AdminError, AdminPage } from "@/components/admin/chrome";
import { FieldShell, PreviewFrame, SectionCard, TextField, Toggle, type Issue } from "@/components/admin/settings-fields";
import type { SiteSettings } from "@/lib/data/settings";
import { cn } from "@/lib/utils";

type Values = {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  phone: string;
  whatsapp: string;
  generalEmail: string;
  supportEmail: string;
  pressEmail: string;
  partnershipsEmail: string;
  bookingUrl: string;
  showEvents: boolean;
  showMap: boolean;
  consentEnabled: boolean;
  maintenance: boolean;
  announcementEn: string;
  announcementAr: string;
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  ogImage: string;
  favicon: string;
  gaMeasurementId: string;
  offerTitleEn: string;
  offerTitleAr: string;
  offerUrl: string;
  offerNoteEn: string;
  offerNoteAr: string;
  paymobIntegrationId: string;
  consentTextEn: string;
  consentTextAr: string;
  offices: { city: string; address: string }[];
  social: string[];
};

type FieldKey = Exclude<keyof Values, "offices" | "social">;
type SectionId = "brand" | "contact" | "visibility" | "seo" | "offer" | "payments" | "privacy";

const sections: { id: SectionId; index: string; title: string; hint: string; keywords: string }[] = [
  { id: "brand", index: "01", title: "الهوية", hint: "الاسم والشعار والوصف الذي يظهر في العنوان والتذييل وصفحات التأشيرة.", keywords: "اسم براند شعار لوجو وصف قانوني" },
  { id: "contact", index: "02", title: "التواصل", hint: "القنوات التي يصل منها العملاء إليك، والمكاتب، وروابط الشبكات.", keywords: "بريد هاتف واتساب مكاتب سوشيال حجز مكالمة" },
  { id: "visibility", index: "03", title: "الظهور والتشغيل", hint: "ما يظهر للزائر الآن: الأقسام، شريط الإعلان، ووضع الصيانة.", keywords: "فعاليات خريطة صيانة إعلان شريط" },
  { id: "seo", index: "04", title: "محركات البحث والمشاركة", hint: "العنوان والوصف في نتائج Google وصورة المشاركة وأيقونة الموقع.", keywords: "seo جوجل عنوان وصف صورة مشاركة أيقونة favicon" },
  { id: "offer", index: "05", title: "العرض الإضافي", hint: "بطاقة عرض اختيارية. تبقى مخفية إلى أن تضع رابطاً.", keywords: "عرض رابط ملاحظة" },
  { id: "payments", index: "06", title: "الدفع", hint: "رقم تكامل Paymob المستخدم في الدفع. المفاتيح السرية تبقى في Coolify.", keywords: "paymob دفع تكامل" },
  { id: "privacy", index: "07", title: "الخصوصية والقياس", hint: "شريط الموافقة على الكوكيز وGoogle Analytics 4.", keywords: "كوكيز موافقة تحليلات ga4 خصوصية" },
];

const fieldLabels: Partial<Record<FieldKey, string>> = {
  name: "اسم البراند",
  supportEmail: "بريد الدعم",
  generalEmail: "البريد العام",
  pressEmail: "بريد الإعلام",
  partnershipsEmail: "بريد الشراكات",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toValues(settings: SiteSettings): Values {
  const extras = settings.extras;
  return {
    name: settings.name,
    legalName: settings.legalName,
    tagline: settings.tagline,
    description: settings.description,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    generalEmail: settings.generalEmail,
    supportEmail: settings.supportEmail,
    pressEmail: settings.pressEmail,
    partnershipsEmail: settings.partnershipsEmail,
    bookingUrl: settings.bookingUrl,
    showEvents: extras.showEvents,
    showMap: extras.showMap,
    consentEnabled: extras.consentEnabled,
    maintenance: extras.maintenance,
    announcementEn: extras.announcementEn,
    announcementAr: extras.announcementAr,
    seoTitleEn: extras.seoTitleEn,
    seoTitleAr: extras.seoTitleAr,
    seoDescriptionEn: extras.seoDescriptionEn,
    seoDescriptionAr: extras.seoDescriptionAr,
    ogImage: extras.ogImage,
    favicon: extras.favicon,
    gaMeasurementId: extras.gaMeasurementId,
    offerTitleEn: extras.offerTitleEn,
    offerTitleAr: extras.offerTitleAr,
    offerUrl: extras.offerUrl,
    offerNoteEn: extras.offerNoteEn,
    offerNoteAr: extras.offerNoteAr,
    paymobIntegrationId: extras.paymobIntegrationId,
    consentTextEn: extras.consentTextEn,
    consentTextAr: extras.consentTextAr,
    offices: settings.offices.map((office) => ({ ...office })),
    social: extras.social.split("\n").map((line) => line.trim()).filter(Boolean),
  };
}

function isLink(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function socialPlatform(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    const known: [string, string][] = [
      ["facebook.com", "Facebook"],
      ["fb.com", "Facebook"],
      ["instagram.com", "Instagram"],
      ["x.com", "X"],
      ["twitter.com", "X"],
      ["tiktok.com", "TikTok"],
      ["youtube.com", "YouTube"],
      ["youtu.be", "YouTube"],
      ["linkedin.com", "LinkedIn"],
      ["wa.me", "WhatsApp"],
      ["whatsapp.com", "WhatsApp"],
      ["t.me", "Telegram"],
      ["snapchat.com", "Snapchat"],
    ];
    return known.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? host;
  } catch {
    return null;
  }
}

function whatsappLink(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const international = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

function collectIssues(values: Values) {
  const issues: Partial<Record<FieldKey | "offices" | "social", Issue>> = {};
  if (!values.name.trim()) issues.name = { level: "error", message: "اسم البراند مطلوب. يظهر في عنوان كل صفحة." };
  for (const key of ["generalEmail", "supportEmail", "pressEmail", "partnershipsEmail"] as const) {
    const value = values[key].trim();
    if (value && !emailPattern.test(value)) issues[key] = { level: "error", message: `${fieldLabels[key]} غير صالح.` };
  }
  if (!values.supportEmail.trim() && !issues.supportEmail) {
    issues.supportEmail = { level: "warn", message: "بدون بريد دعم، رسائل العملاء ونموذج الرد لا يظهر لها عنوان واضح." };
  }
  if (values.whatsapp.trim() && !isLink(values.whatsapp.trim())) {
    issues.whatsapp = { level: "error", message: "واتساب يجب أن يكون رابطاً كاملاً مثل https://wa.me/2010..." };
  }
  if (values.bookingUrl.trim() && !isLink(values.bookingUrl.trim())) {
    issues.bookingUrl = { level: "error", message: "رابط الحجز يجب أن يبدأ بـ https://" };
  }
  for (const key of ["ogImage", "favicon"] as const) {
    if (values[key].trim() && !isLink(values[key].trim())) issues[key] = { level: "error", message: "استخدم رابطاً يبدأ بـ https:// أو مساراً داخلياً يبدأ بـ /" };
  }
  if (values.offerUrl.trim() && !isLink(values.offerUrl.trim())) {
    issues.offerUrl = { level: "error", message: "رابط العرض يجب أن يبدأ بـ https:// أو /" };
  } else if (values.offerUrl.trim() && (!values.offerTitleEn.trim() || !values.offerTitleAr.trim())) {
    issues.offerTitleEn = { level: "warn", message: "العرض سيظهر للزائر. اكتب عنوانه باللغتين." };
  }
  const seoChecks: [FieldKey, number, number][] = [
    ["seoTitleEn", 30, 60],
    ["seoTitleAr", 20, 60],
    ["seoDescriptionEn", 70, 160],
    ["seoDescriptionAr", 50, 160],
  ];
  for (const [key, min, max] of seoChecks) {
    const length = String(values[key]).trim().length;
    if (!length) issues[key] = { level: "warn", message: "فارغ. Google سيختار نصاً من الصفحة بدلاً منه." };
    else if (length > max) issues[key] = { level: "warn", message: `أطول من ${max} حرفاً، وسيُقطع في نتائج البحث.` };
    else if (length < min) issues[key] = { level: "warn", message: `قصير. المدى المناسب ${min}–${max} حرفاً.` };
  }
  if (values.gaMeasurementId.trim() && !/^G-[A-Z0-9]{4,}$/i.test(values.gaMeasurementId.trim())) {
    issues.gaMeasurementId = { level: "error", message: "معرّف GA4 يبدأ بـ G- مثل G-AB12CD34EF" };
  }
  if (values.paymobIntegrationId === "2729467") {
    issues.paymobIntegrationId = { level: "error", message: "هذا التكامل القديم لا يُستخدم. أنشئ تكامل بطاقات Online جديداً." };
  }
  if (values.maintenance) {
    issues.maintenance = { level: "warn", message: "الزوار يرون صفحة الصيانة الآن. الموظفون فقط يرون الموقع." };
  }
  if (values.offices.some((office) => !office.city.trim() !== !office.address.trim())) {
    issues.offices = { level: "warn", message: "المكتب الذي ينقصه المدينة أو العنوان لن يُحفظ." };
  }
  if (values.social.some((line) => line.trim() && !isLink(line.trim()))) {
    issues.social = { level: "error", message: "كل رابط يجب أن يبدأ بـ https://" };
  }
  return issues;
}

const sectionFields: Record<SectionId, (FieldKey | "offices" | "social")[]> = {
  brand: ["name", "legalName", "tagline", "description"],
  contact: ["supportEmail", "generalEmail", "pressEmail", "partnershipsEmail", "phone", "whatsapp", "bookingUrl", "offices", "social"],
  visibility: ["showEvents", "showMap", "maintenance", "announcementEn", "announcementAr"],
  seo: ["seoTitleEn", "seoTitleAr", "seoDescriptionEn", "seoDescriptionAr", "ogImage", "favicon"],
  offer: ["offerTitleEn", "offerTitleAr", "offerUrl", "offerNoteEn", "offerNoteAr"],
  payments: ["paymobIntegrationId"],
  privacy: ["consentEnabled", "consentTextEn", "consentTextAr", "gaMeasurementId"],
};

function readiness(values: Values, hasLogo: boolean) {
  const checks: { label: string; done: boolean; section: SectionId }[] = [
    { label: "اسم البراند", done: Boolean(values.name.trim()), section: "brand" },
    { label: "الشعار", done: hasLogo, section: "brand" },
    { label: "الوصف", done: values.description.trim().length >= 40, section: "brand" },
    { label: "بريد الدعم", done: emailPattern.test(values.supportEmail.trim()), section: "contact" },
    { label: "هاتف أو واتساب", done: Boolean(values.phone.trim() || values.whatsapp.trim()), section: "contact" },
    { label: "عنوان البحث باللغتين", done: Boolean(values.seoTitleEn.trim() && values.seoTitleAr.trim()), section: "seo" },
    { label: "وصف البحث باللغتين", done: Boolean(values.seoDescriptionEn.trim() && values.seoDescriptionAr.trim()), section: "seo" },
    { label: "صورة المشاركة", done: Boolean(values.ogImage.trim()), section: "seo" },
    { label: "الموقع متاح للزوار", done: !values.maintenance, section: "visibility" },
  ];
  return { checks, done: checks.filter((check) => check.done).length };
}

export function SettingsForm({ locale, settings, canEdit = true }: { locale: string; settings: SiteSettings; canEdit?: boolean }) {
  const [baseline, setBaseline] = useState(() => toValues(settings));
  const [values, setValues] = useState(baseline);
  const [logoPicked, setLogoPicked] = useState(false);
  const [clearLogo, setClearLogo] = useState(false);
  const [logoKey, setLogoKey] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<SectionId>("brand");
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof Values>(key: K) => (value: Values[K]) => setValues((current) => ({ ...current, [key]: value }));
  const issues = useMemo(() => collectIssues(values), [values]);
  const errorCount = Object.values(issues).filter((issue) => issue?.level === "error").length;
  const changed = useMemo(() => {
    const keys = Object.keys(values) as (keyof Values)[];
    return keys.filter((key) => JSON.stringify(values[key]) !== JSON.stringify(baseline[key])).length + (logoPicked || clearLogo ? 1 : 0);
  }, [values, baseline, logoPicked, clearLogo]);
  const dirty = changed > 0;
  const ready = readiness(values, Boolean(settings.logoUrl && !clearLogo) || logoPicked);
  const sectionIssues = (id: SectionId) => sectionFields[id].map((key) => issues[key]).filter((issue): issue is Issue => Boolean(issue));

  const normalized = query.trim().toLowerCase();
  const visible = sections.filter((section) => !normalized || `${section.title} ${section.hint} ${section.keywords}`.toLowerCase().includes(normalized));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.getAttribute("data-section") as SectionId);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visible.length]);

  const jump = (id: SectionId) => {
    setQuery("");
    requestAnimationFrame(() => document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const discard = () => {
    setValues(baseline);
    setLogoPicked(false);
    setClearLogo(false);
    setLogoKey((key) => key + 1);
    setError(null);
  };

  const shown = (id: SectionId) => visible.some((section) => section.id === id);
  const meta = (id: SectionId) => {
    const section = sections.find((item) => item.id === id)!;
    return { id: section.id, index: section.index, title: section.title, hint: section.hint };
  };
  const disabled = !canEdit || pending;

  return (
    <AdminPage
      title="إعدادات الموقع"
      description="كل ما يراه الزائر عن هويتك وتواصلك وظهورك في البحث. التغييرات تُطبَّق على الموقع فور الحفظ."
      action={<ReadinessMeter done={ready.done} total={ready.checks.length} />}
    >
      {error && <AdminError>{error}</AdminError>}
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في الإعدادات…"
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5 lg:block lg:overflow-visible">
            {sections.map((section) => {
              const list = sectionIssues(section.id);
              const errors = list.filter((issue) => issue.level === "error").length;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jump(section.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-start text-sm transition-colors lg:w-full",
                    active === section.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    !shown(section.id) && "opacity-40",
                  )}
                >
                  <span className="font-mono text-[11px] text-primary/70">{section.index}</span>
                  <span className="min-w-0 lg:flex-1 lg:truncate">{section.title}</span>
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      errors ? "bg-rose-500" : list.length ? "bg-amber-400" : "bg-emerald-500",
                    )}
                  />
                </button>
              );
            })}
          </nav>
          <div className="hidden rounded-xl border bg-card p-4 lg:block">
            <p className="text-xs font-medium text-muted-foreground">قائمة الجاهزية</p>
            <ul className="mt-3 space-y-2">
              {ready.checks.map((check) => (
                <li key={check.label}>
                  <button type="button" onClick={() => jump(check.section)} className="flex w-full items-center gap-2 text-start text-xs">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px]",
                        check.done ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300" : "border-border text-transparent",
                      )}
                    >
                      ✓
                    </span>
                    <span className={check.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}>{check.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="hidden px-1 text-[11px] text-muted-foreground lg:block">
            اختصار الحفظ: <kbd className="rounded border border-border px-1 font-mono">Ctrl</kbd> + <kbd className="rounded border border-border px-1 font-mono">S</kbd>
          </p>
        </aside>

        <form
          ref={formRef}
          className="min-w-0 space-y-6 pb-28"
          action={(fd) => {
            if (!canEdit) return;
            if (errorCount) {
              setError("صحّح الحقول المعلّمة بالأحمر قبل الحفظ.");
              const first = sections.find((section) => sectionIssues(section.id).some((issue) => issue.level === "error"));
              if (first) jump(first.id);
              return;
            }
            start(async () => {
              setError(null);
              const result = await adminSaveSettingsForm(locale, fd);
              if (result && !result.ok) {
                setError(result.error);
                return;
              }
              setBaseline(values);
              setLogoPicked(false);
              setClearLogo(false);
              setSavedAt(new Date());
            });
          }}
        >
          <input type="hidden" name="offices" value={values.offices.map((office) => `${office.city.trim()} | ${office.address.trim()}`).join("\n")} />
          <input type="hidden" name="social" value={values.social.map((line) => line.trim()).filter(Boolean).join("\n")} />

          <div className={cn(!shown("brand") && "hidden")}>
            <SectionCard
              {...meta("brand")}
              issues={sectionIssues("brand")}
              aside={
                <PreviewFrame label="معاينة الترويسة">
                  <BrandPreview name={values.name} tagline={values.tagline} logoUrl={clearLogo ? "" : settings.logoUrl} />
                </PreviewFrame>
              }
            >
              <TextField name="name" label="اسم البراند" value={values.name} onChange={set("name")} issue={issues.name} required disabled={disabled} counter={{ max: 40 }} />
              <TextField name="legalName" label="الاسم القانوني" value={values.legalName} onChange={set("legalName")} hint="يظهر في الشروط والإيصالات." disabled={disabled} />
              <TextField name="tagline" label="الشعار النصي" value={values.tagline} onChange={set("tagline")} span hint="جملة قصيرة بجوار الاسم وفي رسائل البريد." counter={{ max: 60 }} disabled={disabled} />
              <TextField
                name="description"
                label="وصف الموقع"
                value={values.description}
                onChange={set("description")}
                span
                multiline
                counter={{ min: 40, max: 300 }}
                hint="يُستخدم في التذييل ورسائل البريد."
                disabled={disabled}
              />
              <LogoField
                key={logoKey}
                name={values.name}
                logoUrl={settings.logoUrl}
                clear={clearLogo}
                onClear={setClearLogo}
                onPick={setLogoPicked}
                disabled={disabled}
              />
            </SectionCard>
          </div>

          <div className={cn(!shown("contact") && "hidden")}>
            <SectionCard {...meta("contact")} issues={sectionIssues("contact")}>
              <TextField name="supportEmail" label="بريد الدعم" type="email" inputMode="email" dir="ltr" value={values.supportEmail} onChange={set("supportEmail")} issue={issues.supportEmail} placeholder="support@evisa.tv" disabled={disabled} />
              <TextField name="generalEmail" label="البريد العام" type="email" inputMode="email" dir="ltr" value={values.generalEmail} onChange={set("generalEmail")} issue={issues.generalEmail} placeholder="hello@evisa.tv" disabled={disabled} />
              <TextField name="pressEmail" label="بريد الإعلام" type="email" inputMode="email" dir="ltr" value={values.pressEmail} onChange={set("pressEmail")} issue={issues.pressEmail} disabled={disabled} />
              <TextField name="partnershipsEmail" label="بريد الشراكات" type="email" inputMode="email" dir="ltr" value={values.partnershipsEmail} onChange={set("partnershipsEmail")} issue={issues.partnershipsEmail} disabled={disabled} />
              <TextField name="phone" label="الهاتف" inputMode="tel" dir="ltr" value={values.phone} onChange={set("phone")} placeholder="+20 …" hint="يظهر في التذييل وصفحة التواصل." disabled={disabled} />
              <div>
                <TextField
                  name="whatsapp"
                  label="واتساب"
                  dir="ltr"
                  value={values.whatsapp}
                  onChange={set("whatsapp")}
                  issue={issues.whatsapp}
                  placeholder="https://wa.me/2010…"
                  disabled={disabled}
                />
                {issues.whatsapp && whatsappLink(values.whatsapp) ? (
                  <button type="button" onClick={() => set("whatsapp")(whatsappLink(values.whatsapp)!)} className="mt-2 text-xs text-primary hover:underline">
                    تحويل إلى {whatsappLink(values.whatsapp)}
                  </button>
                ) : null}
              </div>
              <TextField
                name="bookingUrl"
                label="رابط حجز مكالمة الفيديو"
                dir="ltr"
                span
                value={values.bookingUrl}
                onChange={set("bookingUrl")}
                issue={issues.bookingUrl}
                placeholder="https://cal.com/…"
                hint="اتركه فارغاً لإخفاء زر الحجز."
                disabled={disabled}
              />
              <OfficesEditor offices={values.offices} onChange={set("offices")} issue={issues.offices} disabled={disabled} />
              <SocialEditor links={values.social} onChange={set("social")} issue={issues.social} disabled={disabled} />
            </SectionCard>
          </div>

          <div className={cn(!shown("visibility") && "hidden")}>
            <SectionCard
              {...meta("visibility")}
              issues={sectionIssues("visibility")}
              aside={
                <PreviewFrame label="شريط الإعلان">
                  <AnnouncementPreview en={values.announcementEn} ar={values.announcementAr} />
                </PreviewFrame>
              }
            >
              <div className="grid gap-3 sm:col-span-2">
                <Toggle name="showEvents" label="قسم الفعاليات" description="تبويب الفعاليات في الصفحة الرئيسية." checked={values.showEvents} onChange={set("showEvents")} disabled={disabled} />
                <Toggle name="showMap" label="عرض الخريطة" description="زر التبديل بين الشبكة والخريطة في الصفحة الرئيسية." checked={values.showMap} onChange={set("showMap")} disabled={disabled} />
                <Toggle
                  name="maintenance"
                  label="وضع الصيانة"
                  description="يغلق الموقع أمام الزوار. لوحة الإدارة والموظفون لا يتأثرون."
                  checked={values.maintenance}
                  onChange={set("maintenance")}
                  danger
                  disabled={disabled}
                />
                {issues.maintenance ? <p className="text-xs text-rose-300">{issues.maintenance.message}</p> : null}
              </div>
              <TextField name="announcementEn" label="شريط الإعلان" badge="EN" dir="ltr" value={values.announcementEn} onChange={set("announcementEn")} counter={{ max: 120 }} hint="اتركه فارغاً لإخفاء الشريط." disabled={disabled} />
              <TextField name="announcementAr" label="شريط الإعلان" badge="AR" dir="rtl" value={values.announcementAr} onChange={set("announcementAr")} counter={{ max: 120 }} disabled={disabled} />
            </SectionCard>
          </div>

          <div className={cn(!shown("seo") && "hidden")}>
            <SectionCard
              {...meta("seo")}
              issues={sectionIssues("seo")}
              aside={
                <PreviewFrame label="نتيجة Google">
                  <SearchPreview values={values} />
                </PreviewFrame>
              }
            >
              <TextField name="seoTitleEn" label="عنوان البحث" badge="EN" dir="ltr" value={values.seoTitleEn} onChange={set("seoTitleEn")} issue={issues.seoTitleEn} counter={{ min: 30, max: 60 }} disabled={disabled} />
              <TextField name="seoTitleAr" label="عنوان البحث" badge="AR" dir="rtl" value={values.seoTitleAr} onChange={set("seoTitleAr")} issue={issues.seoTitleAr} counter={{ min: 20, max: 60 }} disabled={disabled} />
              <TextField name="seoDescriptionEn" label="وصف البحث" badge="EN" dir="ltr" multiline value={values.seoDescriptionEn} onChange={set("seoDescriptionEn")} issue={issues.seoDescriptionEn} counter={{ min: 70, max: 160 }} disabled={disabled} />
              <TextField name="seoDescriptionAr" label="وصف البحث" badge="AR" dir="rtl" multiline value={values.seoDescriptionAr} onChange={set("seoDescriptionAr")} issue={issues.seoDescriptionAr} counter={{ min: 50, max: 160 }} disabled={disabled} />
              <TextField name="ogImage" label="صورة المشاركة" dir="ltr" value={values.ogImage} onChange={set("ogImage")} issue={issues.ogImage} placeholder="https://evisa.tv/og.jpg" hint="1200×630 تظهر عند مشاركة الرابط في واتساب وفيسبوك." disabled={disabled} />
              <TextField name="favicon" label="أيقونة المتصفح" dir="ltr" value={values.favicon} onChange={set("favicon")} issue={issues.favicon} placeholder="/favicon.ico" hint="فارغ يعني استخدام الشعار المرفوع." disabled={disabled} />
            </SectionCard>
          </div>

          <div className={cn(!shown("offer") && "hidden")}>
            <SectionCard
              {...meta("offer")}
              issues={sectionIssues("offer")}
              aside={
                <PreviewFrame label="حالة العرض">
                  <p className={cn("text-sm font-medium", values.offerUrl.trim() ? "text-emerald-300" : "text-muted-foreground")}>
                    {values.offerUrl.trim() ? "ظاهر للزوار" : "مخفي — لا يوجد رابط"}
                  </p>
                  {values.offerUrl.trim() ? (
                    <div className="mt-3 rounded-lg border bg-card p-3">
                      <p className="text-sm font-semibold" dir="rtl">{values.offerTitleAr || "—"}</p>
                      <p className="mt-1 text-xs text-muted-foreground" dir="rtl">{values.offerNoteAr}</p>
                    </div>
                  ) : null}
                </PreviewFrame>
              }
            >
              <TextField name="offerTitleEn" label="عنوان العرض" badge="EN" dir="ltr" value={values.offerTitleEn} onChange={set("offerTitleEn")} issue={issues.offerTitleEn} counter={{ max: 80 }} disabled={disabled} />
              <TextField name="offerTitleAr" label="عنوان العرض" badge="AR" dir="rtl" value={values.offerTitleAr} onChange={set("offerTitleAr")} counter={{ max: 80 }} disabled={disabled} />
              <TextField name="offerUrl" label="رابط العرض" dir="ltr" span value={values.offerUrl} onChange={set("offerUrl")} issue={issues.offerUrl} placeholder="https://…" hint="العرض يبقى مخفياً إن تُرك فارغاً." disabled={disabled} />
              <TextField name="offerNoteEn" label="ملاحظة العرض" badge="EN" dir="ltr" multiline value={values.offerNoteEn} onChange={set("offerNoteEn")} counter={{ max: 180 }} disabled={disabled} />
              <TextField name="offerNoteAr" label="ملاحظة العرض" badge="AR" dir="rtl" multiline value={values.offerNoteAr} onChange={set("offerNoteAr")} counter={{ max: 180 }} disabled={disabled} />
            </SectionCard>
          </div>

          <div className={cn(!shown("payments") && "hidden")}>
            <SectionCard {...meta("payments")} issues={sectionIssues("payments")}>
              <TextField
                name="paymobIntegrationId"
                label="رقم تكامل Paymob"
                dir="ltr"
                inputMode="numeric"
                value={values.paymobIntegrationId}
                onChange={(value) => set("paymobIntegrationId")(value.replace(/\D/g, ""))}
                issue={issues.paymobIntegrationId}
                placeholder="مثال: 5123456"
                hint={
                  values.paymobIntegrationId
                    ? "هذا الرقم يتقدم على PAYMOB_INTEGRATION_IDS في Coolify."
                    : "فارغ: يُستخدم PAYMOB_INTEGRATION_IDS من Coolify. من Paymob: Developers ثم Payment Integrations، واختر تكامل البطاقة Online فقط."
                }
                disabled={disabled}
              />
              <FieldShell label="مسارات Paymob المطلوبة">
                <dl className="mt-1.5 space-y-2 rounded-lg border bg-background/60 p-3 font-mono text-[11px]" dir="ltr">
                  <div>
                    <dt className="text-muted-foreground">Notification</dt>
                    <dd className="break-all">https://evisa.tv/api/payments/paymob</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Redirection</dt>
                    <dd className="break-all">https://evisa.tv/en-EG/payment/result</dd>
                  </div>
                </dl>
              </FieldShell>
            </SectionCard>
          </div>

          <div className={cn(!shown("privacy") && "hidden")}>
            <SectionCard {...meta("privacy")} issues={sectionIssues("privacy")}>
              <div className="sm:col-span-2">
                <Toggle
                  name="consentEnabled"
                  label="شريط الموافقة على الكوكيز"
                  description="عند تفعيله لا تُسجَّل زيارة ولا يُحمَّل GA4 قبل موافقة الزائر."
                  checked={values.consentEnabled}
                  onChange={set("consentEnabled")}
                  disabled={disabled}
                />
              </div>
              <TextField name="consentTextEn" label="نص الموافقة" badge="EN" dir="ltr" multiline value={values.consentTextEn} onChange={set("consentTextEn")} counter={{ max: 200 }} hint={values.consentEnabled ? undefined : "محفوظ، لكنه لا يظهر والشريط معطّل."} disabled={disabled} />
              <TextField name="consentTextAr" label="نص الموافقة" badge="AR" dir="rtl" multiline value={values.consentTextAr} onChange={set("consentTextAr")} counter={{ max: 200 }} disabled={disabled} />
              <TextField
                name="gaMeasurementId"
                label="معرّف Google Analytics 4"
                dir="ltr"
                value={values.gaMeasurementId}
                onChange={(value) => set("gaMeasurementId")(value.toUpperCase())}
                issue={issues.gaMeasurementId}
                placeholder="G-XXXXXXXXXX"
                hint={values.gaMeasurementId ? (values.consentEnabled ? "يعمل بعد موافقة الزائر." : "يعمل لكل الزوار لأن شريط الموافقة معطّل.") : "فارغ: لا يُحمَّل أي سكربت تحليلات."}
                disabled={disabled}
              />
            </SectionCard>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">لا توجد إعدادات تطابق «{query}».</p>
          ) : null}

          <SaveBar
            dirty={dirty}
            changed={changed}
            errors={errorCount}
            pending={pending}
            savedAt={savedAt}
            canEdit={canEdit}
            onDiscard={discard}
          />
        </form>
      </div>
    </AdminPage>
  );
}

function ReadinessMeter({ done, total }: { done: number; total: number }) {
  const share = total ? done / total : 0;
  const circumference = 2 * Math.PI * 16;
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
      <svg viewBox="0 0 40 40" className="size-10 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
          className={cn("transition-[stroke-dashoffset] duration-500", share === 1 ? "stroke-emerald-400" : "stroke-primary")}
        />
      </svg>
      <div>
        <p className="font-mono text-lg font-semibold tabular-nums leading-none">
          {done}
          <span className="text-sm text-muted-foreground">/{total}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">جاهزية الإعدادات</p>
      </div>
    </div>
  );
}

function SaveBar({
  dirty,
  changed,
  errors,
  pending,
  savedAt,
  canEdit,
  onDiscard,
}: {
  dirty: boolean;
  changed: number;
  errors: number;
  pending: boolean;
  savedAt: Date | null;
  canEdit: boolean;
  onDiscard: () => void;
}) {
  const time = savedAt ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "numeric", minute: "2-digit" }).format(savedAt) : null;
  return (
    <div
      className={cn(
        "sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur transition-colors",
        dirty ? "border-primary/40 bg-card/95" : "bg-card/80",
      )}
    >
      <p className="text-sm">
        {pending ? (
          <span className="text-muted-foreground">جارٍ الحفظ…</span>
        ) : dirty ? (
          <span>
            <span className="font-medium text-primary">{changed}</span> تغيير غير محفوظ
            {errors ? <span className="text-rose-300"> · {errors} حقل يحتاج تصحيح</span> : null}
          </span>
        ) : time ? (
          <span className="text-emerald-300">حُفظت الإعدادات الساعة {time}، والموقع يعرضها الآن.</span>
        ) : (
          <span className="text-muted-foreground">كل الإعدادات محفوظة.</span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={onDiscard}
          className="inline-flex h-9 items-center rounded-lg border border-input px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          تجاهل التغييرات
        </button>
        <button
          disabled={!canEdit || !dirty || pending || errors > 0}
          className="inline-flex h-9 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
        </button>
      </div>
    </div>
  );
}

function BrandPreview({ name, tagline, logoUrl }: { name: string; tagline: string; logoUrl: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#ffffff] px-4 py-3 text-[#0b0d12]">
      {logoUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-7 w-auto max-w-[120px] object-contain" onError={() => setBroken(true)} />
      ) : (
        <span className="text-lg font-bold tracking-tight">{name || "—"}</span>
      )}
      {tagline ? <span className="truncate border-s border-black/10 ps-3 text-xs text-black/60">{tagline}</span> : null}
    </div>
  );
}

function AnnouncementPreview({ en, ar }: { en: string; ar: string }) {
  if (!en.trim() && !ar.trim()) return <p className="text-sm text-muted-foreground">لا يظهر شريط إعلان.</p>;
  return (
    <div className="space-y-2">
      {[
        { text: en, dir: "ltr" as const, tag: "EN" },
        { text: ar, dir: "rtl" as const, tag: "AR" },
      ].map((row) => (
        <div key={row.tag} className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">{row.tag}</span>
          <p dir={row.dir} className="flex-1 truncate rounded-md bg-[#16182b] px-3 py-1.5 text-center text-xs text-white">
            {row.text.trim() || <span className="text-white/40">فارغ</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

function SearchPreview({ values }: { values: Values }) {
  const [lang, setLang] = useState<"en" | "ar">("ar");
  const title = (lang === "en" ? values.seoTitleEn : values.seoTitleAr) || values.name;
  const description = (lang === "en" ? values.seoDescriptionEn : values.seoDescriptionAr) || values.description;
  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
  return (
    <div>
      <div className="mb-3 flex gap-1">
        {(["ar", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={cn("rounded-md px-2.5 py-1 font-mono text-[11px]", lang === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      <div dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-lg bg-[#ffffff] p-4 text-start font-sans">
        <p className="text-xs text-[#4d5156]">evisa.tv › {lang === "ar" ? "ar-EG" : "en-EG"}</p>
        <p className="mt-1 text-[17px] leading-snug text-[#1a0dab]">{clip(title, 60)}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#4d5156]">{clip(description, 160)}</p>
      </div>
    </div>
  );
}

function OfficesEditor({
  offices,
  onChange,
  issue,
  disabled,
}: {
  offices: { city: string; address: string }[];
  onChange: (offices: { city: string; address: string }[]) => void;
  issue?: Issue;
  disabled?: boolean;
}) {
  const update = (index: number, patch: Partial<{ city: string; address: string }>) =>
    onChange(offices.map((office, at) => (at === index ? { ...office, ...patch } : office)));
  return (
    <FieldShell label="المكاتب" span issue={issue} hint="المدينة تظهر في التذييل، والعنوان يظهر عند المرور عليها.">
      <div className="mt-1.5 space-y-2">
        {offices.map((office, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
            <input
              value={office.city}
              onChange={(event) => update(index, { city: event.target.value })}
              placeholder="المدينة"
              disabled={disabled}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary"
            />
            <input
              value={office.address}
              onChange={(event) => update(index, { address: event.target.value })}
              placeholder="العنوان"
              disabled={disabled}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(offices.filter((_, at) => at !== index))}
              className="h-10 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:border-rose-500/50 hover:text-rose-300"
            >
              حذف
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...offices, { city: "", address: "" }])}
          className="h-9 rounded-lg border border-dashed border-input px-4 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          + إضافة مكتب
        </button>
      </div>
    </FieldShell>
  );
}

function SocialEditor({ links, onChange, issue, disabled }: { links: string[]; onChange: (links: string[]) => void; issue?: Issue; disabled?: boolean }) {
  return (
    <FieldShell label="روابط التواصل الاجتماعي" span issue={issue} hint="تظهر في تذييل الموقع بالترتيب نفسه.">
      <div className="mt-1.5 space-y-2">
        {links.map((link, index) => {
          const platform = link.trim() ? socialPlatform(link.trim()) : null;
          return (
            <div key={index} className="flex items-center gap-2">
              <span
                className={cn(
                  "w-24 shrink-0 truncate rounded-md border px-2 py-1 text-center text-[11px]",
                  platform ? "border-primary/30 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {platform ?? "رابط"}
              </span>
              <input
                value={link}
                dir="ltr"
                onChange={(event) => onChange(links.map((item, at) => (at === index ? event.target.value : item)))}
                placeholder="https://instagram.com/evisa"
                disabled={disabled}
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(links.filter((_, at) => at !== index))}
                className="h-10 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:border-rose-500/50 hover:text-rose-300"
              >
                حذف
              </button>
            </div>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...links, ""])}
          className="h-9 rounded-lg border border-dashed border-input px-4 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          + إضافة رابط
        </button>
      </div>
    </FieldShell>
  );
}

function LogoField({
  name,
  logoUrl,
  clear,
  onClear,
  onPick,
  disabled,
}: {
  name: string;
  logoUrl: string;
  clear: boolean;
  onClear: (value: boolean) => void;
  onPick: (picked: boolean) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [tooBig, setTooBig] = useState(false);
  const [broken, setBroken] = useState(false);
  const shown = preview || (!clear && !broken && logoUrl ? logoUrl : "");
  return (
    <FieldShell
      label="الشعار"
      span
      issue={tooBig ? { level: "error", message: "الصورة أكبر من 2 ميغابايت." } : undefined}
      hint="PNG أو JPG أو WebP حتى 2 ميغابايت. يُحفظ داخل قاعدة البيانات على سيرفرك ولا يختفي بعد النشر."
    >
      <div className="mt-1.5 flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-input p-4">
        <div className="flex h-16 w-32 items-center justify-center rounded-md bg-[#ffffff] p-2">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt={name}
              className="max-h-full max-w-full object-contain"
              onError={() => {
                if (!preview) setBroken(true);
              }}
            />
          ) : (
            <span className="text-xs text-black/40">{broken ? "الشعار غير متاح" : "بدون شعار"}</span>
          )}
        </div>
        <div className="space-y-2 text-xs">
          <label className={cn("inline-flex cursor-pointer items-center rounded-lg border border-input px-4 py-2 text-sm hover:border-primary/50", disabled && "pointer-events-none opacity-50")}>
            {shown ? "استبدال الصورة" : "رفع صورة"}
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setPreview(null);
                  setFileName("");
                  setTooBig(false);
                  onPick(false);
                  return;
                }
                setTooBig(file.size > 2 * 1024 * 1024);
                setFileName(file.name);
                setPreview(URL.createObjectURL(file));
                onClear(false);
                onPick(true);
              }}
            />
          </label>
          {fileName ? <p className="text-muted-foreground">{fileName} · يُرفع عند الحفظ</p> : null}
          {logoUrl && !preview ? (
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" name="clearLogo" checked={clear} disabled={disabled} onChange={(event) => onClear(event.target.checked)} />
              إزالة الشعار وعرض الاسم بدلاً منه
            </label>
          ) : null}
        </div>
      </div>
    </FieldShell>
  );
}
