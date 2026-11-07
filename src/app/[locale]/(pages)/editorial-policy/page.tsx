import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { CmsProse } from "@/components/cms/prose-page";
import { requirePageContent } from "@/lib/data/pages";
import { say } from "@/lib/say";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/editorial-policy", { en: "Editorial Policy", ar: "سياسة التحرير" });
}

export default async function EditorialPolicyPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("editorial-policy");
  return (
    <CmsProse
      locale={locale}
      kicker={say(locale, "How we write", "كيف نكتب")}
      title={content.title}
      intro={content.intro}
      body={content.body}
      trustPath="/editorial-policy"
      related={[
        { path: "/transparency/price-change-log", en: "Fee change log", ar: "سجل تغييرات الرسوم" },
        { path: "/tools/visa-requirements", en: "Visa requirements checker", ar: "فحص متطلبات التأشيرة" },
        { path: "/terms", en: "Terms and conditions", ar: "الشروط والأحكام" },
      ]}
    />
  );
}
