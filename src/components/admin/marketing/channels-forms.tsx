"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { adminSaveLimits, adminSaveSms, adminSaveWhatsApp, adminSendTest, adminSuppression } from "@/app/actions/marketing";
import { AdminError, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminSelectClass, adminTextareaClass } from "@/components/admin/chrome";
import type { Channel } from "@/lib/marketing/audience";
import { channelLabels, marketingDate, skipReasons } from "@/lib/marketing/labels";
import { emptyContent } from "@/lib/marketing/render";
import type { SmsConfig, WhatsAppConfig } from "@/lib/data/marketing/settings";
import { cn } from "@/lib/utils";

function useRunner() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  function run(task: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "تعذر الحفظ.");
      else {
        setNotice(done);
        router.refresh();
      }
    });
  }
  const messages: ReactNode = (
    <>
      {error ? <AdminError>{error}</AdminError> : null}
      {notice ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
    </>
  );
  return { run, pending, messages };
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block text-sm", className)}>
      {label}
      {children}
    </label>
  );
}

export function SmsForm({ locale, enabled, config, hasSecret }: { locale: string; enabled: boolean; config: SmsConfig; hasSecret: boolean }) {
  const [draft, setDraft] = useState(config);
  const [on, setOn] = useState(enabled);
  const [secret, setSecret] = useState("");
  const [testTo, setTestTo] = useState("");
  const { run, pending, messages } = useRunner();
  const set = <K extends keyof SmsConfig>(key: K, value: SmsConfig[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => adminSaveSms(locale, { enabled: on, config: draft, secret: secret ? secret : undefined }), "حُفظ إعداد الرسائل النصية.");
        setSecret("");
      }}
    >
      {messages}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} />
        القناة مفعّلة
      </label>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
        <Field label="رابط الإرسال لدى المزوّد">
          <input dir="ltr" value={draft.url} onChange={(event) => set("url", event.target.value)} placeholder="https://provider.example/api/send" className={adminInputClass} />
        </Field>
        <Field label="الطريقة">
          <select value={draft.method} onChange={(event) => set("method", event.target.value as SmsConfig["method"])} className={adminSelectClass}>
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </Field>
        <Field label="شكل البيانات">
          <select value={draft.format} onChange={(event) => set("format", event.target.value as SmsConfig["format"])} className={adminSelectClass}>
            <option value="json">JSON</option>
            <option value="form">Form</option>
            <option value="query">في الرابط</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="حقل الرقم">
          <input dir="ltr" value={draft.toField} onChange={(event) => set("toField", event.target.value)} className={adminInputClass} />
        </Field>
        <Field label="صيغة الرقم">
          <select value={draft.toFormat} onChange={(event) => set("toFormat", event.target.value as SmsConfig["toFormat"])} className={adminSelectClass}>
            <option value="digits">201012345678</option>
            <option value="plus">+201012345678</option>
            <option value="local">01012345678</option>
          </select>
        </Field>
        <Field label="حقل النص">
          <input dir="ltr" value={draft.messageField} onChange={(event) => set("messageField", event.target.value)} className={adminInputClass} />
        </Field>
        <Field label="حقل اسم المرسل">
          <input dir="ltr" value={draft.senderField} onChange={(event) => set("senderField", event.target.value)} className={adminInputClass} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="اسم المرسل المسجّل">
          <input dir="ltr" value={draft.sender} onChange={(event) => set("sender", event.target.value)} placeholder="Evisa" className={adminInputClass} />
        </Field>
        <Field label="التوثيق">
          <select value={draft.authType} onChange={(event) => set("authType", event.target.value as SmsConfig["authType"])} className={adminSelectClass}>
            <option value="bearer">Bearer</option>
            <option value="basic">Basic</option>
            <option value="header">ترويسة باسم</option>
            <option value="none">بدون، أو داخل الحقول</option>
          </select>
        </Field>
        {draft.authType === "basic" ? (
          <Field label="اسم المستخدم">
            <input dir="ltr" value={draft.authUser} onChange={(event) => set("authUser", event.target.value)} className={adminInputClass} />
          </Field>
        ) : null}
        {draft.authType === "header" ? (
          <Field label="اسم الترويسة">
            <input dir="ltr" value={draft.authHeader} onChange={(event) => set("authHeader", event.target.value)} placeholder="X-API-Key" className={adminInputClass} />
          </Field>
        ) : null}
        <Field label={hasSecret ? "المفتاح السري (محفوظ، اتركه فارغاً للإبقاء)" : "المفتاح السري"}>
          <input type="password" dir="ltr" autoComplete="new-password" value={secret} onChange={(event) => setSecret(event.target.value)} className={adminInputClass} />
        </Field>
      </div>
      <Field label="حقول ثابتة إضافية، سطر لكل حقل بالشكل key=value. يمكن كتابة {{secret}} مكان المفتاح.">
        <textarea dir="ltr" rows={3} value={draft.extra} onChange={(event) => set("extra", event.target.value)} placeholder={"username=myaccount\npassword={{secret}}\nlanguage=2"} className={adminTextareaClass} />
      </Field>
      <Field label="نص يدل على النجاح في رد المزوّد (اختياري)">
        <input dir="ltr" value={draft.successMatch} onChange={(event) => set("successMatch", event.target.value)} placeholder="1901" className={adminInputClass} />
      </Field>
      <div className="flex flex-wrap items-end gap-2">
        <button type="submit" className={adminPrimaryClass} disabled={pending}>حفظ</button>
        <Field label="رقم للتجربة">
          <input dir="ltr" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="010…" className={cn(adminInputClass, "w-44")} />
        </Field>
        <button
          type="button"
          className={adminGhostClass}
          disabled={pending || !testTo.trim()}
          onClick={() => run(() => adminSendTest(locale, { channel: "sms", address: testTo, content: { ...emptyContent, body: "رسالة تجربة من لوحة التحكم." }, couponCode: null }), "أُرسلت رسالة التجربة.")}
        >
          أرسل تجربة بعد الحفظ
        </button>
      </div>
    </form>
  );
}

export function WhatsAppForm({
  locale,
  enabled,
  config,
  hasSecret,
  sessionStatus,
}: {
  locale: string;
  enabled: boolean;
  config: WhatsAppConfig;
  hasSecret: boolean;
  sessionStatus: { label: string; ok: boolean } | null;
}) {
  const [draft, setDraft] = useState(config);
  const [on, setOn] = useState(enabled);
  const [secret, setSecret] = useState("");
  const [test, setTest] = useState({ to: "", name: "hello_world", language: "en_US", text: "مرحبا {{name}}" });
  const { run, pending, messages } = useRunner();
  const gowa = draft.provider === "gowa";
  const gowaUrl = !draft.url || draft.url === "https://waha.amail.bar" ? "https://gowa.amail.bar" : draft.url;
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => adminSaveWhatsApp(locale, { enabled: on, config: draft, secret: secret ? secret : undefined }), "حُفظ إعداد واتساب.");
        setSecret("");
      }}
    >
      {messages}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} />
        القناة مفعّلة
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="whatsapp-provider"
            checked={!gowa}
            onChange={() => setDraft({ ...draft, provider: "cloud" })}
          />
          Meta Cloud
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="whatsapp-provider"
            checked={gowa}
            onChange={() => setDraft({ ...draft, provider: "gowa", url: gowaUrl })}
          />
          GOWA
        </label>
      </div>
      {gowa ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="عنوان GOWA">
            <input dir="ltr" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://gowa.amail.bar" className={adminInputClass} />
          </Field>
          <Field label="معرّف الجهاز">
            <input dir="ltr" value={draft.device} onChange={(event) => setDraft({ ...draft, device: event.target.value })} placeholder="اتركه فارغاً إن كان جهازاً واحداً" className={adminInputClass} />
          </Field>
          <Field label="اسم المستخدم">
            <input dir="ltr" autoComplete="off" value={draft.authUser} onChange={(event) => setDraft({ ...draft, authUser: event.target.value })} className={adminInputClass} />
          </Field>
          <Field label={hasSecret ? "كلمة المرور (محفوظة، اتركها فارغة للإبقاء)" : "كلمة المرور"}>
            <input type="password" dir="ltr" autoComplete="new-password" value={secret} onChange={(event) => setSecret(event.target.value)} className={adminInputClass} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Phone number ID">
            <input dir="ltr" value={draft.phoneNumberId} onChange={(event) => setDraft({ ...draft, phoneNumberId: event.target.value })} className={adminInputClass} />
          </Field>
          <Field label="إصدار الواجهة">
            <input dir="ltr" value={draft.apiVersion} onChange={(event) => setDraft({ ...draft, apiVersion: event.target.value })} className={adminInputClass} />
          </Field>
          <Field label={hasSecret ? "Access token (محفوظ، اتركه فارغاً للإبقاء)" : "Access token"}>
            <input type="password" dir="ltr" autoComplete="new-password" value={secret} onChange={(event) => setSecret(event.target.value)} className={adminInputClass} />
          </Field>
        </div>
      )}
      {gowa ? (
        <p className="text-xs text-muted-foreground">
          اسم المستخدم وكلمة المرور هما دخول لوحة GOWA. كلمة المرور تُحفظ مشفّرة ولا تُعرض بعد الحفظ. {sessionStatus ? <span className={sessionStatus.ok ? "text-emerald-300" : "text-amber-300"}>{sessionStatus.label}</span> : "احفظ العنوان وبيانات الدخول لتظهر حالة الجهاز."} الإرسال الجماعي الكثيف عبر هذا الربط قد يؤدي إلى حظر الرقم.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">يُفضّل رمز مستخدم نظام دائم من Meta Business. الرسائل الترويجية تُرسل من قوالب معتمدة فقط، وتُحتسب بسعر Meta.</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <button type="submit" className={adminPrimaryClass} disabled={pending}>حفظ</button>
        <Field label="رقم للتجربة">
          <input dir="ltr" value={test.to} onChange={(event) => setTest({ ...test, to: event.target.value })} placeholder="010…" className={cn(adminInputClass, "w-40")} />
        </Field>
        {gowa ? (
          <Field label="نص التجربة">
            <input dir="auto" value={test.text} onChange={(event) => setTest({ ...test, text: event.target.value })} className={cn(adminInputClass, "w-64")} />
          </Field>
        ) : (
          <>
            <Field label="قالب">
              <input dir="ltr" value={test.name} onChange={(event) => setTest({ ...test, name: event.target.value })} className={cn(adminInputClass, "w-36")} />
            </Field>
            <Field label="لغة">
              <input dir="ltr" value={test.language} onChange={(event) => setTest({ ...test, language: event.target.value })} className={cn(adminInputClass, "w-24")} />
            </Field>
          </>
        )}
        <button
          type="button"
          className={adminGhostClass}
          disabled={pending || !test.to.trim() || (gowa && test.text.trim().length < 2)}
          onClick={() =>
            run(
              () =>
                adminSendTest(locale, {
                  channel: "whatsapp",
                  address: test.to,
                  content: gowa ? { ...emptyContent, body: test.text } : { ...emptyContent, waName: test.name, waLanguage: test.language },
                  couponCode: null,
                }),
              "أُرسلت رسالة التجربة.",
            )
          }
        >
          أرسل تجربة بعد الحفظ
        </button>
      </div>
    </form>
  );
}

export function LimitsForm({ locale, initial }: { locale: string; initial: { capCount: number; capDays: number; quietStart: number; quietEnd: number } }) {
  const [draft, setDraft] = useState(initial);
  const { run, pending, messages } = useRunner();
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => adminSaveLimits(locale, draft), "حُفظت الحدود.");
      }}
    >
      {messages}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="أقصى عدد رسائل تسويقية للعميل">
          <input type="number" min={0} max={100} dir="ltr" value={draft.capCount} onChange={(event) => setDraft({ ...draft, capCount: Number(event.target.value) })} className={adminInputClass} />
        </Field>
        <Field label="خلال (أيام)">
          <input type="number" min={1} max={90} dir="ltr" value={draft.capDays} onChange={(event) => setDraft({ ...draft, capDays: Number(event.target.value) })} className={adminInputClass} />
        </Field>
        <Field label="هدوء الرسائل النصية وواتساب من">
          <select value={draft.quietStart} onChange={(event) => setDraft({ ...draft, quietStart: Number(event.target.value) })} className={adminSelectClass}>
            {hours.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
          </select>
        </Field>
        <Field label="حتى">
          <select value={draft.quietEnd} onChange={(event) => setDraft({ ...draft, quietEnd: Number(event.target.value) })} className={adminSelectClass}>
            {hours.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
          </select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">صفر يعني بلا حد. ساعات الهدوء بتوقيت القاهرة، والرسائل تنتظر حتى تنتهي. اجعل البداية والنهاية متساويتين لإيقافها.</p>
      <button type="submit" className={adminPrimaryClass} disabled={pending}>حفظ</button>
    </form>
  );
}

export function SuppressionList({ locale, rows, total }: { locale: string; rows: { channel: Channel; address: string; reason: string | null; createdAt: string }[]; total: number }) {
  const [channel, setChannel] = useState<Channel>("email");
  const [address, setAddress] = useState("");
  const { run, pending, messages } = useRunner();
  return (
    <div className="space-y-3">
      {messages}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => adminSuppression(locale, { channel, address, block: true }), "أُضيف إلى قائمة المنع.");
          setAddress("");
        }}
      >
        <Field label="القناة">
          <select value={channel} onChange={(event) => setChannel(event.target.value as Channel)} className={cn(adminSelectClass, "w-36")}>
            {(Object.keys(channelLabels) as Channel[]).map((item) => <option key={item} value={item}>{channelLabels[item]}</option>)}
          </select>
        </Field>
        <Field label="بريد أو رقم">
          <input dir="ltr" value={address} onChange={(event) => setAddress(event.target.value)} className={cn(adminInputClass, "w-64")} />
        </Field>
        <button type="submit" className={adminGhostClass} disabled={pending || !address.trim()}>منع</button>
      </form>
      <p className="text-xs text-muted-foreground">{total} عنوان ممنوع. من ألغى الاشتراك أو ارتد بريده أو اشتكى يُضاف تلقائياً.</p>
      {rows.length ? (
        <ul className="divide-y text-sm">
          {rows.map((row) => (
            <li key={`${row.channel}-${row.address}`} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">
                <span dir="ltr">{row.address}</span>
                <span className="ms-2 text-xs text-muted-foreground">{channelLabels[row.channel]} · {skipReasons[row.reason ?? ""] ?? row.reason} · {marketingDate(row.createdAt)}</span>
              </span>
              <button
                type="button"
                className={cn(adminDangerClass, "h-8 px-3 text-xs")}
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`رفع المنع عن ${row.address}؟ افعل ذلك فقط إن طلب العميل العودة.`)) {
                    run(() => adminSuppression(locale, { channel: row.channel, address: row.address, block: false }), "رُفع المنع.");
                  }
                }}
              >
                رفع المنع
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
