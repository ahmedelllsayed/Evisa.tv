import { readFileSync, writeFileSync } from "node:fs";

const pages = [
  ["src/app/[locale]/(pages)/newsroom/page.tsx", "/newsroom", "Newsroom", "الأخبار"],
  ["src/app/[locale]/(pages)/transparency/status/page.tsx", "/transparency/status", "Status", "الحالة"],
  ["src/app/[locale]/(pages)/transparency/price-change-log/page.tsx", "/transparency/price-change-log", "Fee Change Audit", "سجل الرسوم"],
  ["src/app/[locale]/(pages)/transparency/refunds-policy/page.tsx", "/transparency/refunds-policy", "Refunds Policy", "سياسة الاسترداد"],
  ["src/app/[locale]/(pages)/account/page.tsx", "/account", "My applications", "طلباتي"],
  ["src/app/[locale]/(pages)/on-time-guaranteed/page.tsx", "/on-time-guaranteed", "On Time Guaranteed", "في الموعد"],
  ["src/app/[locale]/(pages)/tools/visa-photo-maker/page.tsx", "/tools/visa-photo-maker", "Visa Photo Creator", "صورة التأشيرة"],
  ["src/app/[locale]/(pages)/emergency-care/page.tsx", "/emergency-care", "Emergency Helpline", "الطوارئ"],
  ["src/app/[locale]/(pages)/wall-of-love/page.tsx", "/wall-of-love", "Wall of Love", "آراء العملاء"],
  ["src/app/[locale]/(pages)/tools/visa-requirements/page.tsx", "/tools/visa-requirements", "Visa Requirements Checker", "فحص متطلبات التأشيرة"],
  ["src/app/[locale]/(pages)/terms/page.tsx", "/terms", "Terms", "الشروط"],
  ["src/app/[locale]/(pages)/editorial-policy/page.tsx", "/editorial-policy", "Editorial Policy", "سياسة التحرير"],
  ["src/app/[locale]/(pages)/partners/page.tsx", "/partners", "Partners", "الشركاء"],
  ["src/app/[locale]/(pages)/passport-index/page.tsx", "/passport-index", "Passport Index", "مؤشر الجوازات"],
  ["src/app/[locale]/(pages)/privacy/page.tsx", "/privacy", "Privacy", "الخصوصية"],
  ["src/app/[locale]/(pages)/sign-in/page.tsx", "/sign-in", "Sign in", "تسجيل الدخول"],
  ["src/app/[locale]/(pages)/account/profile/page.tsx", "/account/profile", "Profile", "الملف"],
  ["src/app/[locale]/(pages)/contact/page.tsx", "/contact", "Contact", "تواصل"],
  ["src/app/[locale]/(pages)/rejection-recovery/page.tsx", "/rejection-recovery", "Rejection Recovery", "ملاحظات الرفض"],
];

for (const [file, path, en, ar] of pages) {
  let text = readFileSync(file, "utf8");
  if (!text.includes("export const metadata")) continue;
  text = text.replace(/export const metadata = \{ title: ".*" \};\r?\n/, "");
  if (!text.includes('from "@/lib/seo"')) {
    text = `import { localizedMetadata } from "@/lib/seo";\nimport type { Page } from "@/lib/page";\n${text}`;
  }
  const fn = `export async function generateMetadata({ params }: Page) {\n  const { locale } = await params;\n  return localizedMetadata(locale, "${path}", { en: ${JSON.stringify(en)}, ar: ${JSON.stringify(ar)} });\n}\n\n`;
  const marker = text.match(/export default async function/);
  if (!marker || marker.index == null) {
    console.error("skip", file);
    continue;
  }
  text = text.slice(0, marker.index) + fn + text.slice(marker.index);
  writeFileSync(file, text);
  console.log("updated", file);
}
