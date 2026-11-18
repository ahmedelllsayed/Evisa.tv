import { redirect } from "next/navigation";
import { AdminPage, AdminPanel, KeyValue, Pill } from "@/components/admin/chrome";
import { LimitsForm, SmsForm, SuppressionList, WhatsAppForm } from "@/components/admin/marketing/channels-forms";
import { CopyButton } from "@/components/admin/marketing/copy-button";
import { siteConfig } from "@/config/site.config";
import { marketingAccess } from "@/lib/data/marketing/access";
import { listSuppressions } from "@/lib/data/marketing/library";
import { emailReady, getMarketingSettings, getSmsChannel, getWhatsAppChannel } from "@/lib/data/marketing/settings";
import { gowaDeviceStatus } from "@/lib/data/marketing/send";
import type { Page } from "@/lib/page";

export const metadata = { title: "القنوات" };

export default async function MarketingChannelsPage({ params }: Page) {
  const { locale } = await params;
  const access = await marketingAccess(locale);
  if (!access.full) redirect(`/${locale}/admin/marketing`);
  const [sms, whatsapp, settings, suppressions] = await Promise.all([getSmsChannel(), getWhatsAppChannel(), getMarketingSettings(), listSuppressions()]);
  const deviceStatus = await gowaDeviceStatus(whatsapp);
  const base = siteConfig.url.replace(/\/$/, "");
  const webhook = `${base}/api/webhooks/resend`;
  const cron = `${base}/api/cron/marketing`;
  return (
    <AdminPage title="القنوات" description="مزوّدو الإرسال وحدود الرسائل وقائمة المنع. المفاتيح تُحفظ مشفّرة ولا تُعرض بعد الحفظ.">
      <AdminPanel title="البريد" hint="يُرسل عبر Resend المضبوط على الخادم.">
        <KeyValue
          items={[
            { label: "الإرسال", value: <Pill tone={emailReady() ? "success" : "danger"} dot>{emailReady() ? "مضبوط" : "غير مضبوط"}</Pill> },
            { label: "إشعارات الارتداد والشكوى", value: <Pill tone={process.env.RESEND_WEBHOOK_SECRET ? "success" : "warning"} dot>{process.env.RESEND_WEBHOOK_SECRET ? "مضبوطة" : "تحتاج RESEND_WEBHOOK_SECRET"}</Pill> },
            {
              label: "رابط الإشعارات في Resend",
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  <code dir="ltr" className="text-xs">{webhook}</code>
                  <CopyButton value={webhook} />
                </span>
              ),
            },
            {
              label: "مهمة الجدولة والتلقائية",
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  <Pill tone={process.env.CRON_SECRET ? "success" : "warning"} dot>{process.env.CRON_SECRET ? "CRON_SECRET مضبوط" : "CRON_SECRET غير مضبوط"}</Pill>
                  <code dir="ltr" className="text-xs">POST {cron}</code>
                </span>
              ),
            },
          ]}
        />
        <p className="mt-3 text-xs text-muted-foreground">في Resend اختر حدثي email.bounced وemail.complained. المهمة المجدولة تنادي الرابط كل دقيقة مع Authorization: Bearer CRON_SECRET.</p>
      </AdminPanel>
      <AdminPanel title="الرسائل النصية" hint="أي مزوّد يقبل طلب HTTP: اكتب حقول الطلب كما في توثيقه. الأرقام تُرسل بالصيغة التي تختارها.">
        <SmsForm locale={locale} enabled={sms.enabled} config={sms.config} hasSecret={sms.hasSecret} />
      </AdminPanel>
      <AdminPanel title="واتساب" hint={whatsapp.config.provider === "gowa" ? "نص حر عبر GOWA على خادمك." : "WhatsApp Cloud API من Meta."}>
        <WhatsAppForm locale={locale} enabled={whatsapp.enabled} config={whatsapp.config} hasSecret={whatsapp.hasSecret} sessionStatus={deviceStatus} />
      </AdminPanel>
      <AdminPanel title="حدود الإرسال" hint="تسري على الحملات والرسائل التلقائية معاً.">
        <LimitsForm locale={locale} initial={{ capCount: settings.capCount, capDays: settings.capDays, quietStart: settings.quietStart, quietEnd: settings.quietEnd }} />
      </AdminPanel>
      <AdminPanel title="قائمة المنع">
        <SuppressionList locale={locale} rows={suppressions.rows} total={suppressions.total} />
      </AdminPanel>
    </AdminPage>
  );
}
