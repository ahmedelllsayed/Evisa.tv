import { AdminPage } from "@/components/admin/chrome";
import { AutomationsBoard } from "@/components/admin/marketing/automations-board";
import { listCoupons } from "@/lib/data/coupons";
import { marketingAccess } from "@/lib/data/marketing/access";
import { listAutomations } from "@/lib/data/marketing/automations";
import { listTemplates } from "@/lib/data/marketing/library";
import type { Page } from "@/lib/page";

export const metadata = { title: "الرسائل التلقائية" };

export default async function MarketingAutomationsPage({ params }: Page) {
  const { locale } = await params;
  const access = await marketingAccess(locale);
  const [rows, templates, coupons] = await Promise.all([listAutomations(), listTemplates(), listCoupons()]);
  return (
    <AdminPage title="الرسائل التلقائية" description="رسالة تخرج وحدها بعد حدث: طلب لم يُدفع، عميل لم يعد، موافقة على تأشيرة، أو تسجيل من غير طلب.">
      <AutomationsBoard
        locale={locale}
        canEdit={access.canEdit}
        cronReady={Boolean(process.env.CRON_SECRET)}
        rows={rows}
        templates={templates.map((template) => ({ id: template.id, name: template.name, channel: template.channel }))}
        coupons={coupons.map((coupon) => ({ id: coupon.id, code: coupon.code }))}
      />
    </AdminPage>
  );
}
