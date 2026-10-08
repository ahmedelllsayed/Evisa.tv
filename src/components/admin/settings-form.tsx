"use client";

import { useEffect, useState, useTransition } from "react";
import { adminSaveSettingsForm } from "@/app/actions/admin";
import { AdminCard, AdminError, AdminField, AdminPage, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import type { SiteSettings } from "@/lib/data/settings";

export function SettingsForm({ locale, settings }: { locale: string; settings: SiteSettings }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
    setPreview(null);
    setFileName("");
  }, [settings.logoUrl]);
  const shown = preview || (!broken && settings.logoUrl ? settings.logoUrl : "");
  return (
    <AdminPage title="إعدادات الموقع" description="اسم البراند يظهر في العنوان والتذييل وصفحات التأشيرة. ارفع شعارك ليحل مكان العلامة الحالية.">
      {error && <AdminError>{error}</AdminError>}
      <AdminCard>
        <form
          className="grid gap-3 sm:grid-cols-2"
          action={(fd) =>
            start(async () => {
              setError(null);
              setSaved(false);
              const result = await adminSaveSettingsForm(locale, fd);
              if (result && !result.ok) setError(result.error);
              else setSaved(true);
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
            {shown ? (
              <img
                src={shown}
                alt={settings.name}
                className="mt-2 h-16 w-auto max-w-full rounded-lg border border-line bg-white object-contain p-2"
                onError={() => {
                  if (!preview) setBroken(true);
                }}
              />
            ) : (
              <p className="mt-1 text-xs text-muted-ink">
                {broken ? "الشعار السابق لم يعد متاحاً. ارفع الصورة مرة أخرى ثم احفظ." : "لا يوجد شعار مرفوع. الموقع يعرض الاسم إلى أن ترفع صورة."}
              </p>
            )}
            <label className="mt-3 inline-flex cursor-pointer items-center rounded-full border border-line bg-white px-4 py-2 text-sm">
              اختيار صورة
              <input
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setSaved(false);
                  if (!file) {
                    setPreview(null);
                    setFileName("");
                    return;
                  }
                  setFileName(file.name);
                  setPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            {fileName && <p className="mt-2 text-xs text-muted-ink">{fileName}</p>}
            <p className="mt-2 text-xs text-muted-ink">PNG أو JPG أو WebP، بحد أقصى 2 ميغابايت. يُحفظ الشعار مع الإعدادات ولا يختفي بعد النشر.</p>
            {settings.logoUrl && (
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" name="clearLogo" />
                إزالة الشعار المرفوع
              </label>
            )}
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
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button disabled={pending} className={adminPrimaryClass}>
              {pending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
            {saved && <p className="text-sm text-brand">تم حفظ الإعدادات.</p>}
          </div>
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
