import "server-only";
import { sendMail } from "@/lib/email";
import { phoneForProvider, wahaChatId } from "@/lib/marketing/phone";
import type { ChannelState, SmsConfig, WhatsAppConfig } from "./settings";

export type SendResult = { ok: true; ref: string | null } | { ok: false; error: string };

function refFrom(text: string) {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const nested = Array.isArray(body.messages) ? (body.messages[0] as Record<string, unknown> | undefined) : undefined;
    const value = body.id ?? body.sid ?? body.message_id ?? body.messageId ?? nested?.id ?? null;
    return value == null ? null : String(value).slice(0, 120);
  } catch {
    return null;
  }
}

export async function sendEmailMessage(input: { to: string; subject: string; text: string; html: string; key: string; stopUrl: string }): Promise<SendResult> {
  const result = await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    idempotencyKey: input.key,
    headers: { "List-Unsubscribe": `<${input.stopUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
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

/** Free text through the self-hosted WAHA gateway. `linkPreview` stays off so WhatsApp does not fetch the link. */
export async function sendWahaText(channel: ChannelState<WhatsAppConfig>, to: string, text: string): Promise<SendResult> {
  const config = channel.config;
  if (!channel.enabled) return { ok: false, error: "قناة واتساب متوقفة" };
  if (!config.url || !config.session || !channel.secret) return { ok: false, error: "إعداد WAHA غير مكتمل" };
  try {
    const res = await fetch(`${config.url}/api/sendText`, {
      method: "POST",
      headers: { "X-Api-Key": channel.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ session: config.session, chatId: wahaChatId(to), text, linkPreview: false }),
      signal: AbortSignal.timeout(15000),
    });
    const reply = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${reply.slice(0, 160)}`.trim() };
    return { ok: true, ref: refFrom(reply) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "تعذر الاتصال" };
  }
}

export type WahaSessionState = { label: string; ok: boolean };

const wahaStatusLabel: Record<string, WahaSessionState> = {
  WORKING: { label: "الجلسة تعمل", ok: true },
  SCAN_QR_CODE: { label: "تنتظر رمز الجوال", ok: false },
  STARTING: { label: "الجلسة تبدأ", ok: false },
  FAILED: { label: "الجلسة متوقفة", ok: false },
  STOPPED: { label: "الجلسة متوقفة", ok: false },
};

/** Reads one WAHA session so the channels page can say whether the phone is connected. */
export async function wahaSessionStatus(channel: ChannelState<WhatsAppConfig>): Promise<WahaSessionState | null> {
  if (channel.config.provider !== "waha" || !channel.config.url || !channel.secret) return null;
  try {
    const res = await fetch(`${channel.config.url}/api/sessions/${encodeURIComponent(channel.config.session || "default")}`, {
      headers: { "X-Api-Key": channel.secret },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) return { label: "المفتاح غير مقبول", ok: false };
    if (res.status === 404) return { label: "الجلسة غير موجودة", ok: false };
    if (!res.ok) return { label: `تعذر قراءة الجلسة (${res.status})`, ok: false };
    const body = (await res.json()) as { status?: string };
    return wahaStatusLabel[String(body.status ?? "")] ?? { label: "حالة غير معروفة", ok: false };
  } catch {
    return { label: "تعذر الاتصال بـ WAHA", ok: false };
  }
}

/** WhatsApp Cloud API. Marketing messages must use a template Meta approved. */
export async function sendWhatsAppMessage(
  channel: ChannelState<WhatsAppConfig>,
  to: string,
  template: { name: string; language: string; params: string[] },
): Promise<SendResult> {
  if (channel.config.provider === "waha") return { ok: false, error: "هذه الرسالة لقالب Meta، والمزود الحالي هو WAHA" };
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
