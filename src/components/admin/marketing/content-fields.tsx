"use client";

import { adminInputClass, adminTextareaClass } from "@/components/admin/chrome";
import type { Channel } from "@/lib/marketing/audience";
import { smsParts } from "@/lib/marketing/phone";
import type { MessageContent } from "@/lib/marketing/render";

export function ContentFields({ channel, content, onChange, disabled }: { channel: Channel; content: MessageContent; onChange: (next: MessageContent) => void; disabled?: boolean }) {
  const set = <K extends keyof MessageContent>(key: K, value: MessageContent[K]) => onChange({ ...content, [key]: value });
  if (channel === "whatsapp") {
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          واتساب يقبل الرسائل الترويجية من قالب اعتمدته Meta فقط. اكتب اسم القالب ولغته كما في حساب واتساب للأعمال، ثم قيمة كل متغير بالترتيب.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            اسم القالب المعتمد
            <input dir="ltr" disabled={disabled} value={content.waName ?? ""} onChange={(event) => set("waName", event.target.value.trim() || null)} placeholder="spring_offer" className={adminInputClass} />
          </label>
          <label className="block text-sm">
            اللغة
            <input dir="ltr" disabled={disabled} value={content.waLanguage ?? ""} onChange={(event) => set("waLanguage", event.target.value.trim() || null)} placeholder="ar" className={adminInputClass} />
          </label>
        </div>
        <label className="block text-sm">
          متغيرات القالب، سطر لكل متغير
          <textarea
            dir="auto"
            rows={4}
            disabled={disabled}
            value={content.waParams.join("\n")}
            onChange={(event) => set("waParams", event.target.value.split("\n").slice(0, 10))}
            placeholder={"{{name}}\n{{code}}\n{{link}}"}
            className={adminTextareaClass}
          />
        </label>
      </div>
    );
  }
  const parts = channel === "sms" ? smsParts(`${content.body}\nإلغاء: https://evisa.tv/api/m/XXXXXXXXXX`) : null;
  return (
    <div className="space-y-3">
      {channel === "email" ? (
        <label className="block text-sm">
          الموضوع
          <input dir="auto" disabled={disabled} value={content.subject ?? ""} onChange={(event) => set("subject", event.target.value || null)} className={adminInputClass} />
        </label>
      ) : null}
      <label className="block text-sm">
        النص بالعربية
        <textarea dir="auto" rows={channel === "sms" ? 4 : 8} disabled={disabled} value={content.body} onChange={(event) => set("body", event.target.value)} className={adminTextareaClass} />
      </label>
      {parts ? (
        <p className="text-xs text-muted-foreground">
          {parts.chars} حرفاً مع رابط الإلغاء · {parts.parts} {parts.parts === 1 ? "جزء" : "أجزاء"} {parts.unicode ? "(نص عربي: 70 حرفاً للجزء)" : "(160 حرفاً للجزء)"}
        </p>
      ) : null}
      <details className="rounded-lg border p-3 text-sm" open={Boolean(content.bodyEn)}>
        <summary className="cursor-pointer">نسخة إنجليزية لمن يتصفح بالإنجليزية (اختياري)</summary>
        <div className="mt-3 space-y-3">
          {channel === "email" ? (
            <label className="block text-sm">
              Subject
              <input dir="ltr" disabled={disabled} value={content.subjectEn ?? ""} onChange={(event) => set("subjectEn", event.target.value || null)} className={adminInputClass} />
            </label>
          ) : null}
          <label className="block text-sm">
            Text
            <textarea dir="ltr" rows={channel === "sms" ? 3 : 6} disabled={disabled} value={content.bodyEn ?? ""} onChange={(event) => set("bodyEn", event.target.value || null)} className={adminTextareaClass} />
          </label>
        </div>
      </details>
      <p className="text-xs text-muted-foreground">
        المتغيرات: {"{{name}}"} الاسم الأول، {"{{code}}"} رمز الخصم، {"{{link}}"} رابط متتبَّع للموقع. إن لم تكتب {"{{code}}"} يُضاف الرمز في آخر الرسالة. رابط الإلغاء يُضاف تلقائياً.
      </p>
    </div>
  );
}
