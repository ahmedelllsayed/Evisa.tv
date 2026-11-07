import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";
import { say } from "@/lib/say";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/terms", { en: "Terms", ar: "الشروط" });
}

export default async function TermsPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("terms");
  return (
    <CmsProse
      locale={locale}
      kicker={say(locale, "Policy", "سياسة")}
      title={content.title}
      intro={content.intro}
      body={content.body}
      trustPath="/terms"
      related={[
        { path: "/transparency/refunds-policy", en: "Refunds policy", ar: "سياسة الاسترداد" },
        { path: "/on-time-guaranteed", en: "How the target date works", ar: "كيف يعمل الموعد المستهدف" },
        { path: "/privacy", en: "Privacy policy", ar: "سياسة الخصوصية" },
      ]}
    />
  );
}
