import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";
import { say } from "@/lib/say";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/privacy", { en: "Privacy", ar: "الخصوصية" });
}

export default async function PrivacyPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("privacy");
  return (
    <CmsProse
      locale={locale}
      kicker={say(locale, "Policy", "سياسة")}
      title={content.title}
      intro={content.intro}
      body={content.body}
      trustPath="/privacy"
      related={[
        { path: "/security", en: "How we protect your data", ar: "كيف نحمي بياناتك" },
        { path: "/terms", en: "Terms and conditions", ar: "الشروط والأحكام" },
        { path: "/transparency/refunds-policy", en: "Refunds policy", ar: "سياسة الاسترداد" },
      ]}
    />
  );
}
