import { AdminPage } from "@/components/admin/chrome";
import { TemplatesBoard } from "@/components/admin/marketing/templates-board";
import { marketingAccess } from "@/lib/data/marketing/access";
import { listTemplates } from "@/lib/data/marketing/library";
import { getWhatsAppChannel } from "@/lib/data/marketing/settings";
import type { Page } from "@/lib/page";

export const metadata = { title: "القوالب" };

export default async function MarketingTemplatesPage({ params }: Page) {
  const { locale } = await params;
  const access = await marketingAccess(locale);
  const [templates, whatsapp] = await Promise.all([listTemplates(), getWhatsAppChannel()]);
  return (
    <AdminPage title="القوالب" description="رسائل محفوظة لكل قناة تستخدمها الحملات والرسائل التلقائية. النسخة الإنجليزية تصل لمن يتصفح بالإنجليزية.">
      <TemplatesBoard
        locale={locale}
        canEdit={access.canEdit}
        whatsappText={whatsapp.config.provider === "gowa"}
        templates={templates.map((template) => ({ id: template.id, name: template.name, channel: template.channel, content: template.content }))}
      />
    </AdminPage>
  );
}
