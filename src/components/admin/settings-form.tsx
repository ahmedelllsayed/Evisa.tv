"use client";

import { useState, useTransition } from "react";
import { adminSaveSettingsForm } from "@/app/actions/admin";
import { AdminCard, AdminError, AdminField, AdminPage, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import type { SiteSettings } from "@/lib/data/settings";

export function SettingsForm({ locale, settings }: { locale: string; settings: SiteSettings }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
          <LogoField key={settings.logoUrl} name={settings.name} logoUrl={settings.logoUrl} onPick={() => setSaved(false)} />
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
          <Field name="offerTitleEn" label="عنوان العرض الإضافي بالإنجليزية" defaultValue={settings.extras.offerTitleEn} />
          <Field name="offerTitleAr" label="عنوان العرض الإضافي بالعربية" defaultValue={settings.extras.offerTitleAr} />
          <Field name="offerUrl" label="رابط العرض (يبقى مخفياً إن تُرك فارغاً)" defaultValue={settings.extras.offerUrl} />
          <Field name="offerNoteEn" label="ملاحظة العرض بالإنجليزية" defaultValue={settings.extras.offerNoteEn} />
          <Field name="offerNoteAr" label="ملاحظة العرض بالعربية" defaultValue={settings.extras.offerNoteAr} />
          <Field name="reservationFlightFee" label="سعر ملف الطيران (جنيه)" type="number" min="0" defaultValue={String(settings.extras.reservationFlightFee)} />
          <Field name="reservationHotelFee" label="سعر ملف الفندق (جنيه)" type="number" min="0" defaultValue={String(settings.extras.reservationHotelFee)} />
          <Field name="reservationItineraryFee" label="سعر برنامج الرحلة (جنيه)" type="number" min="0" defaultValue={String(settings.extras.reservationItineraryFee)} />
          <Check name="reservationFlightOn" label="إظهار الطيران" defaultChecked={settings.extras.reservationFlightOn} />
          <Check name="reservationHotelOn" label="إظهار الفندق" defaultChecked={settings.extras.reservationHotelOn} />
          <Check name="reservationItineraryOn" label="إظهار برنامج الرحلة" defaultChecked={settings.extras.reservationItineraryOn} />
          <div className="text-sm sm:col-span-2">
            <Field name="paymobIntegrationId" label="رقم تكامل Paymob" defaultValue={settings.extras.paymobIntegrationId} />
            <p className="mt-1 text-xs text-muted-ink">من نفس حساب Paymob المرتبط بمفتاح السر: Developers ثم Payment Integrations. اختر تكامل البطاقة الأونلاين فقط.</p>
          </div>
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

function LogoField({ name, logoUrl, onPick }: { name: string; logoUrl: string; onPick: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [broken, setBroken] = useState(false);
  const shown = preview || (!broken && logoUrl ? logoUrl : "");
  return (
    <div className="text-sm sm:col-span-2">
      الشعار
      {shown ? (
        <img
          src={shown}
          alt={name}
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
            onPick();
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
      {logoUrl && (
        <label className="mt-2 flex items-center gap-2">
          <input type="checkbox" name="clearLogo" />
          إزالة الشعار المرفوع
        </label>
      )}
    </div>
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
