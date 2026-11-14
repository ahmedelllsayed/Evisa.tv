"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminContinueCampaign, adminDeleteContact, adminImportContacts, adminPreviewAudience, adminSendCampaign } from "@/app/actions/campaigns";
import { AdminError, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass, adminTextareaClass } from "@/components/admin/chrome";
import type { AudienceFilter, AudiencePerson, AudienceSource, PurchaseFilter, SexFilter } from "@/lib/campaign-mail";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

const visaChoices = [
  ["", "أي نوع"],
  ["e-visa", "e-Visa"],
  ["eta", "ETA"],
  ["sticker", "Sticker"],
  ["e-voa", "e-VOA"],
  ["mdac", "MDAC"],
  ["visa-free", "بدون تأشيرة"],
  ["custom", "نوع مخصص"],
] as const;

const sexChoices = [
  ["", "أي جنس"],
  ["male", "ذكر"],
  ["female", "أنثى"],
  ["other", "آخر"],
] as const;

const purchaseChoices = [
  ["any", "أي عدد"],
  ["none", "لم يشترِ"],
  ["once", "مرة واحدة"],
  ["repeat", "متكرر، مرتين أو أكثر"],
  ["min", "حد أدنى"],
] as const;

const sexLabel: Record<string, string> = { male: "ذكر", female: "أنثى", other: "آخر" };
const statusLabel = { pending: "بالانتظار", sent: "أُرسل", failed: "فشل", skipped: "تُرك" };

const emptyFilter: AudienceFilter = {
  source: "customers",
  visaType: null,
  sex: null,
  purchases: "any",
  minPurchases: 2,
  destinationId: null,
  nationality: null,
  query: "",
};

export type CampaignRow = {
  id: string;
  subject: string;
  couponCode: string | null;
  status: "sending" | "sent";
  when: string;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
};

export type CampaignDetail = CampaignRow & {
  body: string;
  recipients: { email: string; name: string | null; status: keyof typeof statusLabel; error: string | null }[];
};

export function CampaignDesk({
  locale,
  canEdit,
  mailReady,
  destinations,
  nationalities,
  coupons,
  contacts,
  contactTotal,
  campaigns,
  selected,
}: {
  locale: string;
  canEdit: boolean;
  mailReady: boolean;
  destinations: { id: string; name: string }[];
  nationalities: { code: string; name: string }[];
  coupons: { id: string; code: string; active: boolean }[];
  contacts: { id: string; email: string; name: string | null }[];
  contactTotal: number;
  campaigns: CampaignRow[];
  selected: CampaignDetail | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<AudienceFilter>(emptyFilter);
  const [preview, setPreview] = useState<{ total: number; sample: AudiencePerson[] } | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [sendAll, setSendAll] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [couponId, setCouponId] = useState("");
  const [importText, setImportText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const customersOnly = filter.source !== "imported";

  function update(next: AudienceFilter) {
    setFilter(next);
    setPreview(null);
  }

  function runPreview() {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await adminPreviewAudience(locale, filter);
      if (!result.ok) {
        setPreview(null);
        setError(result.error);
        return;
      }
      setPreview({ total: result.total, sample: result.sample });
      setChecked(Object.fromEntries(result.sample.map((person) => [person.id, true])));
      setSendAll(true);
    });
  }

  function send() {
    if (!preview) return;
    const ids = preview.sample.filter((person) => (sendAll ? !checked[person.id] : checked[person.id])).map((person) => person.id);
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await adminSendCampaign(locale, {
        filter,
        selection: { all: sendAll, ids },
        subject,
        body,
        couponId: couponId || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(`أُرسل ${result.sent}. فشل ${result.failed}. تبقّى ${result.pending}.`);
      router.push(href(`/admin/campaigns?campaign=${result.id}`, locale));
      router.refresh();
    });
  }

  function importContacts() {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await adminImportContacts(locale, importText);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setImportText("");
      setPreview(null);
      setNotice(
        [`أُضيف ${result.added}`, result.existingAccounts ? `حساب موجود ${result.existingAccounts}` : "", result.duplicates ? `مكرر ${result.duplicates}` : "", result.unsubscribed ? `ألغى الاشتراك ${result.unsubscribed}` : "", result.invalid ? `غير صالح ${result.invalid}` : ""]
          .filter(Boolean)
          .join(" · "),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {!mailReady ? <AdminError>إرسال البريد غير مضبوط على الخادم. يمكنك تجهيز الجمهور، والإرسال يعمل بعد ضبط المفتاح.</AdminError> : null}
      {error ? <AdminError>{error}</AdminError> : null}
      {notice ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}

      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">جهات من خارج الموقع</h2>
            <p className="mt-1 text-sm text-muted-foreground">سطر لكل بريد، أو بريد ثم الاسم. الحساب الموجود يُعامل كعميل. المحفوظ الآن {contactTotal}.</p>
          </div>
        </div>
        <textarea value={importText} disabled={!canEdit} onChange={(event) => setImportText(event.target.value)} rows={4} placeholder={"mona@example.com, منى\nAli <ali@example.com>"} className={adminTextareaClass} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className={cn(adminGhostClass, "cursor-pointer")}>
            ملف
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              disabled={!canEdit}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setImportText(await file.text());
              }}
            />
          </label>
          <button type="button" className={adminPrimaryClass} disabled={!canEdit || pending || !importText.trim()} onClick={importContacts}>
            حفظ الجهات
          </button>
        </div>
        {contacts.length ? (
          <ul className="mt-4 divide-y text-sm">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{contact.name || contact.email}</span>
                  {contact.name ? <span className="ms-2 text-muted-foreground" dir="ltr">{contact.email}</span> : null}
                </span>
                <button
                  type="button"
                  className={adminDangerClass}
                  disabled={!canEdit || pending}
                  onClick={() => {
                    if (!window.confirm(`حذف ${contact.email}؟`)) return;
                    start(async () => {
                      const result = await adminDeleteContact(locale, contact.id);
                      if (!result.ok) setError(result.error);
                      else router.refresh();
                    });
                  }}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">الجمهور</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              القائمة
              <select value={filter.source} onChange={(event) => update({ ...filter, source: event.target.value as AudienceSource })} className={adminSelectClass}>
                <option value="customers">العملاء المطابقون</option>
                <option value="imported">الجهات المستوردة</option>
                <option value="both">الاثنان معاً</option>
              </select>
            </label>
            <label className="block text-sm">
              بحث
              <input value={filter.query} onChange={(event) => update({ ...filter, query: event.target.value })} placeholder="اسم أو بريد" className={adminInputClass} />
            </label>
            <label className="block text-sm">
              نوع التأشيرة
              <select disabled={!customersOnly} value={filter.visaType ?? ""} onChange={(event) => update({ ...filter, visaType: event.target.value || null })} className={adminSelectClass}>
                {visaChoices.map(([id, label]) => <option key={id || "any"} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              الجنس
              <select disabled={!customersOnly} value={filter.sex ?? ""} onChange={(event) => update({ ...filter, sex: (event.target.value || null) as SexFilter | null })} className={adminSelectClass}>
                {sexChoices.map(([id, label]) => <option key={id || "any"} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              الشراء
              <select disabled={!customersOnly} value={filter.purchases} onChange={(event) => update({ ...filter, purchases: event.target.value as PurchaseFilter })} className={adminSelectClass}>
                {purchaseChoices.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            {filter.purchases === "min" ? (
              <label className="block text-sm">
                الحد الأدنى
                <input type="number" min={1} dir="ltr" disabled={!customersOnly} value={filter.minPurchases ?? 2} onChange={(event) => update({ ...filter, minPurchases: Number(event.target.value) })} className={adminInputClass} />
              </label>
            ) : null}
            <label className="block text-sm">
              الوجهة
              <select disabled={!customersOnly} value={filter.destinationId ?? ""} onChange={(event) => update({ ...filter, destinationId: event.target.value || null })} className={adminSelectClass}>
                <option value="">أي وجهة</option>
                {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              الجنسية
              <select disabled={!customersOnly} value={filter.nationality ?? ""} onChange={(event) => update({ ...filter, nationality: event.target.value || null })} className={adminSelectClass}>
                <option value="">أي جنسية</option>
                {nationalities.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </label>
          </div>
          {filter.source === "both" ? <p className="mt-3 text-xs text-muted-foreground">الفلاتر تخص العملاء. الجهات المستوردة تُضاف حسب البحث فقط.</p> : null}
          {filter.source === "customers" ? <p className="mt-3 text-xs text-muted-foreground">حسابات الموظفين لا تدخل. من لا جنس له يظهر فقط عند «أي جنس».</p> : null}
          <button type="button" className={cn(adminGhostClass, "mt-4")} disabled={pending} onClick={runPreview}>{pending ? "جارٍ العرض" : "اعرض المطابقين"}</button>
          {preview ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{preview.total} شخص</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sendAll} onChange={(event) => setSendAll(event.target.checked)} />
                  إرسال لكل المطابقين
                </label>
              </div>
              {preview.total > preview.sample.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {sendAll ? "العينة أول 40. الإرسال يشمل كل المطابقين إلا من أزلت تحديده." : "من غير «إرسال لكل المطابقين» يُرسل إلى المحدد من هذه العينة فقط."}
                </p>
              ) : null}
              <ul className="mt-2 divide-y text-sm">
                {preview.sample.map((person) => (
                  <li key={person.id} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked[person.id] !== false}
                      onChange={(event) => setChecked((current) => ({ ...current, [person.id]: event.target.checked }))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{person.name}</span>
                      <span className="ms-2 text-muted-foreground" dir="ltr">{person.email}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {person.kind === "imported" ? "مستورد" : `${person.sex ? sexLabel[person.sex] : "بلا جنس"} · ${person.purchases}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <form
          className="space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <h2 className="font-semibold">الرسالة</h2>
          <label className="block text-sm">
            الموضوع
            <input value={subject} disabled={!canEdit} onChange={(event) => setSubject(event.target.value)} className={adminInputClass} />
          </label>
          <label className="block text-sm">
            النص
            <textarea value={body} disabled={!canEdit} onChange={(event) => setBody(event.target.value)} rows={8} className={adminTextareaClass} />
          </label>
          <label className="block text-sm">
            كوبون
            <select value={couponId} disabled={!canEdit} onChange={(event) => setCouponId(event.target.value)} className={adminSelectClass}>
              <option value="">بدون خصم</option>
              {coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>{coupon.code}{coupon.active ? "" : " · متوقف"}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">اكتب {"{{code}}"} حيث تريد الرمز. إن لم تكتبه يُضاف في آخر الرسالة، مع رابط إلغاء الاشتراك.</p>
          <button type="submit" className={adminPrimaryClass} disabled={!canEdit || pending || !preview || !mailReady}>
            أرسل
          </button>
        </form>
      </div>

      {selected ? (
        <section className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{selected.subject}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.when}{selected.couponCode ? ` · ${selected.couponCode}` : ""}</p>
            </div>
            {selected.pending > 0 ? (
              <button
                type="button"
                className={adminPrimaryClass}
                disabled={!canEdit || pending || !mailReady}
                onClick={() => {
                  setError(null);
                  start(async () => {
                    const result = await adminContinueCampaign(locale, selected.id);
                    if (!result.ok) setError(result.error);
                    else {
                      setNotice(`أُرسل ${result.sent}. فشل ${result.failed}. تبقّى ${result.pending}.`);
                      router.refresh();
                    }
                  });
                }}
              >
                أكمل الإرسال
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-sm whitespace-pre-wrap">{selected.body}</p>
          <p className="mt-3 text-sm">أُرسل {selected.sent} · فشل {selected.failed} · تُرك {selected.skipped} · انتظار {selected.pending}</p>
          <ul className="mt-3 divide-y text-sm">
            {selected.recipients.map((recipient) => (
              <li key={recipient.email} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span>{recipient.name || recipient.email}</span>
                  {recipient.name ? <span className="ms-2 text-muted-foreground" dir="ltr">{recipient.email}</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">{statusLabel[recipient.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-card text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-medium">الموضوع</th>
              <th className="px-3 py-2 text-start font-medium">النتيجة</th>
              <th className="px-3 py-2 text-start font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">لا توجد رسائل بعد.</td>
              </tr>
            ) : campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-t">
                <td className="px-3 py-3">
                  <a className="font-medium" href={href(`/admin/campaigns?campaign=${campaign.id}`, locale)}>{campaign.subject}</a>
                  <p className="text-xs text-muted-foreground">{campaign.when}{campaign.couponCode ? ` · ${campaign.couponCode}` : ""}</p>
                </td>
                <td className="px-3 py-3">{campaign.sent} أُرسل{campaign.failed ? ` · ${campaign.failed} فشل` : ""}{campaign.pending ? ` · ${campaign.pending} انتظار` : ""}</td>
                <td className="px-3 py-3">{campaign.status === "sent" ? "اكتمل" : "جارٍ"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
