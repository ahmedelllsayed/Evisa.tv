import type { Channel } from "./audience.ts";

export type MessageContent = {
  subject: string | null;
  subjectEn: string | null;
  body: string;
  bodyEn: string | null;
  waName: string | null;
  waLanguage: string | null;
  waParams: string[];
};

export type MessageVars = {
  name: string;
  code: string | null;
  link: string;
};

export const emptyContent: MessageContent = {
  subject: null,
  subjectEn: null,
  body: "",
  bodyEn: null,
  waName: null,
  waLanguage: null,
  waParams: [],
};

export function cleanContent(input: Partial<MessageContent> | null | undefined): MessageContent {
  const raw = { ...emptyContent, ...(input ?? {}) };
  const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
  return {
    subject: text(raw.subject, 150),
    subjectEn: text(raw.subjectEn, 150),
    body: typeof raw.body === "string" ? raw.body.trim().slice(0, 8000) : "",
    bodyEn: text(raw.bodyEn, 8000),
    waName: text(raw.waName, 120),
    waLanguage: text(raw.waLanguage, 12),
    waParams: Array.isArray(raw.waParams) ? raw.waParams.map((param) => String(param ?? "").slice(0, 500)).slice(0, 10) : [],
  };
}

export function contentProblem(channel: Channel, content: MessageContent) {
  if (channel === "whatsapp") {
    if (!content.waName || !/^[a-z0-9_]{1,120}$/.test(content.waName)) return "اكتب اسم قالب واتساب المعتمد بحروف إنجليزية صغيرة وشرطة سفلية.";
    if (!content.waLanguage || !/^[a-z]{2}(_[A-Z]{2})?$/.test(content.waLanguage)) return "اكتب لغة قالب واتساب مثل ar أو en_US.";
    return null;
  }
  if (channel === "email" && (!content.subject || content.subject.length < 2)) return "اكتب موضوع الرسالة.";
  if (content.body.length < 2) return "اكتب نص الرسالة.";
  if (channel === "sms" && content.body.length > 1000) return "الرسالة النصية أطول من 1000 حرف.";
  return null;
}

/** English copy is used only when the customer browses in English and the English text exists. */
export function pickLanguage(content: MessageContent, locale: string | null) {
  const english = Boolean(locale && !locale.toLowerCase().startsWith("ar") && content.bodyEn);
  return {
    english,
    subject: english ? content.subjectEn || content.subject || "" : content.subject || "",
    body: english ? content.bodyEn || content.body : content.body,
  };
}

export function fillVariables(text: string, vars: MessageVars) {
  return text
    .replaceAll("{{name}}", vars.name)
    .replaceAll("{{code}}", vars.code ?? "")
    .replaceAll("{{link}}", vars.link);
}

/** Adds the code at the end when the text does not place it. */
export function withCode(text: string, code: string | null, english: boolean) {
  if (!code || text.includes("{{code}}") || text.includes(code)) return text;
  return `${text}\n\n${english ? "Discount code" : "رمز الخصم"}: ${code}`;
}

export function firstName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.includes("@") ? "" : first;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function linkify(html: string) {
  return html.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:#3f46d6">${url}</a>`);
}

export function renderEmail(input: { content: MessageContent; locale: string | null; vars: MessageVars; brand: string; address: string | null; stopUrl: string }) {
  const chosen = pickLanguage(input.content, input.locale);
  const message = fillVariables(withCode(chosen.body, input.vars.code, chosen.english), input.vars);
  const subject = fillVariables(chosen.subject, input.vars);
  const stopLabel = chosen.english ? "Unsubscribe" : "إلغاء الاشتراك";
  const text = [message, "", input.brand, input.address, `${stopLabel}: ${input.stopUrl}`].filter((line) => line != null).join("\n");
  const paragraphs = message
    .split(/\n{2,}/)
    .map((part) => `<p style="margin:0 0 12px">${linkify(escapeHtml(part)).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const dir = chosen.english ? "ltr" : "rtl";
  const lang = chosen.english ? "en" : "ar";
  const html = `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:24px;font-family:Tahoma,Arial,sans-serif;color:#16182b;line-height:1.6">${paragraphs}<p style="margin-top:24px;color:#5c6570;font-size:12px">${escapeHtml(input.brand)}${input.address ? `<br>${escapeHtml(input.address)}` : ""}<br><a href="${escapeHtml(input.stopUrl)}" style="color:#5c6570">${stopLabel}</a></p></body></html>`;
  return { subject, text, html };
}

export function renderSms(input: { content: MessageContent; locale: string | null; vars: MessageVars; stopUrl: string }) {
  const chosen = pickLanguage(input.content, input.locale);
  const message = fillVariables(withCode(chosen.body, input.vars.code, chosen.english), input.vars);
  return `${message}\n${chosen.english ? "Stop" : "إلغاء"}: ${input.stopUrl}`;
}

export function renderWhatsAppParams(content: MessageContent, vars: MessageVars) {
  return content.waParams.map((param) => fillVariables(param, vars) || "-");
}
