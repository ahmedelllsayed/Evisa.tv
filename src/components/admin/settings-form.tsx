"use client";

import { useState, useTransition } from "react";
import { adminSaveSettingsForm } from "@/app/actions/admin";
import { AdminCard, AdminError, AdminField, AdminPage, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import type { SiteSettings } from "@/lib/data/settings";

export function SettingsForm({ locale, settings }: { locale: string; settings: SiteSettings }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <AdminPage title="إعدادات الموقع" description="اسم البراند يظهر في العنوان والتذييل وصفحات التأشيرة. ارفع شعارك ليحل مكان العلامة الحالية.">
      {error && <AdminError>{error}</AdminError>}
      <AdminCard>
        <form
          className="grid gap-3 sm:grid-cols-2"
          action={(fd) =>
            start(async () => {
              setError(null);
              const result = await adminSaveSettingsForm(locale, fd);
              if (result && !result.ok) setError(result.error);
            })
          }
        >
          <Field name="name" label="اسم البراند" defaultValue={settings.name} required />
          <Field name="legalName" label="الاسم القانوني" defaultValue={settings.legalName} />
          <Field name="tagline" label="الشعار النصي" defaultValue={settings.tagline} />
          <Field name="phone" label="الهاتف" defaultValue={settings.phone} />
          <label className="text-sm sm:col-span-2">
            الوصف
            <textarea name="description" defaultValue={settings.description} className={adminTextareaClass} />
          </label>
          <div className="text-sm sm:col-span-2">
            الشعار
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.name} className="mt-2 h-10 w-auto" />
            ) : (
              <p className="mt-1 text-xs text-muted-ink">العلامة المرسومة الحالية. ارفع صورة لاستبدالها.</p>
            )}
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" />
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" name="clearLogo" />
              إزالة الشعار المرفوع
            </label>
          </div>
          <Field name="generalEmail" label="بريد عام" defaultValue={settings.generalEmail} />
          <Field name="supportEmail" label="بريد الدعم" defaultValue={settings.supportEmail} />
          <Field name="pressEmail" label="بريد الإعلام" defaultValue={settings.pressEmail} />
          <Field name="partnershipsEmail" label="بريد الشراكات" defaultValue={settings.partnershipsEmail} />
          <Field name="whatsapp" label="واتساب" defaultValue={settings.whatsapp} />
          <p className="text-sm text-muted-ink sm:col-span-2">
            نسبة الموافقة الظاهرة للزائر تُحسب من الطلبات التي حُسمت بالموافقة أو الرفض. لا تُدخل نسبة يدوية.
          </p>
          <Field name="bookingUrl" label="رابط حجز مكالمة الفيديو" defaultValue={settings.bookingUrl} />
          <label className="text-sm sm:col-span-2">
            المكاتب (سطر: المدينة | العنوان)
            <textarea
              name="offices"
              defaultValue={settings.offices.map((office) => `${office.city} | ${office.address}`).join("\n")}
              className={adminTextareaClass}
            />
          </label>
          <Check name="showStats" label="إظهار الأرقام في الرئيسية" defaultChecked={settings.extras.showStats} />
          <Check name="showEvents" label="إظهار الفعاليات" defaultChecked={settings.extras.showEvents} />
          <Check name="showMap" label="إظهار الخريطة" defaultChecked={settings.extras.showMap} />
          <Check name="consentEnabled" label="شريط الموافقة على الكوكيز" defaultChecked={settings.extras.consentEnabled} />
          <Check name="maintenance" label="وضع الصيانة للزوار" defaultChecked={settings.extras.maintenance} />
          <Field name="announcementEn" label="شريط إعلان بالإنجليزية" defaultValue={settings.extras.announcementEn} />
          <Field name="announcementAr" label="شريط إعلان بالعربية" defaultValue={settings.extras.announcementAr} />
          <Field name="seoTitleEn" label="عنوان SEO بالإنجليزية" defaultValue={settings.extras.seoTitleEn} />
          <Field name="seoTitleAr" label="عنوان SEO بالعربية" defaultValue={settings.extras.seoTitleAr} />
          <Field name="seoDescriptionEn" label="وصف SEO بالإنجليزية" defaultValue={settings.extras.seoDescriptionEn} />
          <Field name="seoDescriptionAr" label="وصف SEO بالعربية" defaultValue={settings.extras.seoDescriptionAr} />
          <Field name="ogImage" label="صورة المشاركة" defaultValue={settings.extras.ogImage} />
          <Field name="favicon" label="أيقونة الموقع" defaultValue={settings.extras.favicon} />
          <Field name="gaMeasurementId" label="معرّف GA4" defaultValue={settings.extras.gaMeasurementId} />
          <Field name="paymobIntegrationId" label="رقم تكامل Paymob" defaultValue={settings.extras.paymobIntegrationId} />
          <Field name="consentTextEn" label="نص الموافقة بالإنجليزية" defaultValue={settings.extras.consentTextEn} />
          <Field name="consentTextAr" label="نص الموافقة بالعربية" defaultValue={settings.extras.consentTextAr} />
          <label className="text-sm sm:col-span-2">
            روابط التواصل (سطر لكل رابط)
            <textarea name="social" defaultValue={settings.extras.social} className={adminTextareaClass} />
          </label>
          <button disabled={pending} className={`${adminPrimaryClass} sm:col-span-2`}>
            حفظ الإعدادات
          </button>
        </form>
      </AdminCard>
    </AdminPage>
  );
}

function Field(props: { name: string; label: string; defaultValue: string; type?: string; step?: string; min?: string; max?: string; required?: boolean }) {
  return <AdminField {...props} />;
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
