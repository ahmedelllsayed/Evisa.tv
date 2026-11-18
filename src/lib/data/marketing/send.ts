import "server-only";
import { sendMail } from "@/lib/email";
import { gowaPhone, phoneForProvider } from "@/lib/marketing/phone";
import type { ChannelState, SmsConfig, WhatsAppConfig } from "./settings";

export type SendResult = { ok: true; ref: string | null } | { ok: false; error: string };

function refFrom(text: string) {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const nested = Array.isArray(body.messages) ? (body.messages[0] as Record<string, unknown> | undefined) : undefined;
    const results = body.results && typeof body.results === "object" ? (body.results as Record<string, unknown>) : undefined;
    const value = body.id ?? body.sid ?? body.message_id ?? body.messageId ?? results?.message_id ?? nested?.id ?? null;
    return value == null ? null : String(value).slice(0, 120);
  } catch {
    return null;
  }
}

export async function sendEmailMessage(input: { to: string; subject: string; text: string; html: string; key: string }): Promise<SendResult> {
  const result = await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    idempotencyKey: input.key,
  });
  return result.sent ? { ok: true, ref: null } : { ok: false, error: "تعذر الإرسال عبر Resend" };
}

function extraParams(extra: string, secret: string) {
  const params: Record<string, string> = {};
  for (const line of extra.split(/\r?\n/)) {
    const at = line.indexOf("=");
    if (at <= 0) continue;
    const key = line.slice(0, at).trim();
    if (key) params[key] = line.slice(at + 1).trim().replaceAll("{{secret}}", secret);
  }
  return params;
}

/** Generic HTTP provider: the field names, body format, and auth come from the channels page. */
export async function sendSmsMessage(channel: ChannelState<SmsConfig>, to: string, text: string): Promise<SendResult> {
  const config = channel.config;
  if (!channel.enabled) return { ok: false, error: "قناة الرسائل النصية متوقفة" };
  if (!/^https:\/\//.test(config.url)) return { ok: false, error: "رابط مزوّد الرسائل غير مضبوط" };
  const secret = channel.secret ?? "";
  const params: Record<string, string> = {
    ...extraParams(config.extra, secret),
    [config.toField]: phoneForProvider(to, config.toFormat),
    [config.messageField]: text,
  };
  if (config.senderField && config.sender) params[config.senderField] = config.sender;
  const headers: Record<string, string> = {};
  if (config.authType === "bearer" && secret) headers.Authorization = `Bearer ${secret}`;
  if (config.authType === "basic") headers.Authorization = `Basic ${Buffer.from(`${config.authUser}:${secret}`).toString("base64")}`;
  if (config.authType === "header" && config.authHeader && secret) headers[config.authHeader] = secret;
  let url = config.url;
  let body: string | undefined;
  if (config.format === "query" || config.method === "GET") {
    const target = new URL(config.url);
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
    url = target.toString();
  } else if (config.format === "form") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(params).toString();
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(params);
  }
  try {
    const res = await fetch(url, { method: config.method, headers, body, signal: AbortSignal.timeout(15000) });
    const reply = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${reply.slice(0, 160)}`.trim() };
    if (config.successMatch && !reply.includes(config.successMatch)) return { ok: false, error: reply.slice(0, 200) || "رد غير متوقع" };
    return { ok: true, ref: refFrom(reply) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "تعذر الاتصال" };
  }
}

function graphError(reply: string) {
  try {
    return String((JSON.parse(reply) as { error?: { message?: string } }).error?.message ?? reply).slice(0, 200);
  } catch {
    return reply.slice(0, 200);
  }
}

function basicAuth(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

/** Free text through the self-hosted GOWA gateway. */
export async function sendGowaText(channel: ChannelState<WhatsAppConfig>, to: string, text: string): Promise<SendResult> {
  const config = channel.config;
  if (!channel.enabled) return { ok: false, error: "قناة واتساب متوقفة" };
  if (!config.url || !config.authUser || !channel.secret) return { ok: false, error: "إعداد GOWA غير مكتمل" };
  const headers: Record<string, string> = {
    Authorization: basicAuth(config.authUser, channel.secret),
    "Content-Type": "application/json",
  };
  if (config.device) headers["X-Device-Id"] = config.device;
  try {
    const res = await fetch(`${config.url}/send/message`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: gowaPhone(to), message: text }),
      signal: AbortSignal.timeout(15000),
    });
    const reply = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${reply.slice(0, 160)}`.trim() };
    return { ok: true, ref: refFrom(reply) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "تعذر الاتصال" };
  }
}

export type GowaDeviceState = { label: string; ok: boolean };

type GowaDevice = { id?: string; state?: string };

/** Reads GOWA devices so the channels page can say whether the phone is linked. */
export async function gowaDeviceStatus(channel: ChannelState<WhatsAppConfig>): Promise<GowaDeviceState | null> {
  if (channel.config.provider !== "gowa" || !channel.config.url || !channel.config.authUser || !channel.secret) return null;
  try {
    const res = await fetch(`${channel.config.url}/devices`, {
      headers: { Authorization: basicAuth(channel.config.authUser, channel.secret) },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) return { label: "بيانات الدخول غير مقبولة", ok: false };
    if (!res.ok) return { label: `تعذر قراءة الأجهزة (${res.status})`, ok: false };
    const body = (await res.json()) as { results?: GowaDevice[] };
    const devices = Array.isArray(body.results) ? body.results : [];
    const chosen = channel.config.device ? devices.find((item) => item.id === channel.config.device) : devices.length === 1 ? devices[0] : undefined;
    if (channel.config.device && !chosen) return { label: "الجهاز غير موجود", ok: false };
    if (!chosen) {
      return devices.length === 0
        ? { label: "لا يوجد جهاز. أنشئه من لوحة GOWA وامسح الرمز.", ok: false }
        : { label: "أكثر من جهاز. اكتب معرّف الجهاز.", ok: false };
    }
    if (chosen.state === "logged_in") return { label: "الجهاز يعمل", ok: true };
    if (chosen.state === "connected" || chosen.state === "connecting") return { label: "الجهاز يتصل", ok: false };
    if (chosen.state === "disconnected") return { label: "ينتظر رمز الجوال", ok: false };
    return { label: "حالة غير معروفة", ok: false };
  } catch {
    return { label: "تعذر الاتصال بـ GOWA", ok: false };
  }
}

/** WhatsApp Cloud API. Marketing messages must use a template Meta approved. */
export async function sendWhatsAppMessage(
  channel: ChannelState<WhatsAppConfig>,
  to: string,
  template: { name: string; language: string; params: string[] },
): Promise<SendResult> {
  if (channel.config.provider === "gowa") return { ok: false, error: "هذه الرسالة لقالب Meta، والمزود الحالي هو GOWA" };
  if (!channel.enabled) return { ok: false, error: "قناة واتساب متوقفة" };
  if (!channel.config.phoneNumberId || !channel.secret) return { ok: false, error: "إعداد واتساب غير مكتمل" };
  const components = template.params.length ? [{ type: "body", parameters: template.params.map((text) => ({ type: "text", text })) }] : [];
  try {
    const res = await fetch(`https://graph.facebook.com/${channel.config.apiVersion}/${channel.config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${channel.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "template",
        template: { name: template.name, language: { code: template.language }, components },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const reply = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${graphError(reply)}`.trim() };
    return { ok: true, ref: refFrom(reply) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "تعذر الاتصال" };
  }
}
