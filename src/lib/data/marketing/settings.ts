import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { CouponAppliesTo, CouponKind } from "@/lib/coupon-math";
import { serverEnv } from "@/lib/env";
import type { PhoneFormat } from "@/lib/marketing/phone";
import { json, one, sql } from "../db";

export type RewardRule = { kind: CouponKind; value: number; appliesTo: CouponAppliesTo };

export type MarketingSettings = {
  capCount: number;
  capDays: number;
  quietStart: number;
  quietEnd: number;
  referral: {
    enabled: boolean;
    friend: RewardRule;
    reward: RewardRule & { validDays: number };
  };
};

export const defaultMarketingSettings: MarketingSettings = {
  capCount: 3,
  capDays: 7,
  quietStart: 22,
  quietEnd: 9,
  referral: {
    enabled: false,
    friend: { kind: "percent", value: 10, appliesTo: "service" },
    reward: { kind: "percent", value: 10, appliesTo: "service", validDays: 90 },
  },
};

function whole(value: unknown, fallback: number, min: number, max: number) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function rule(value: Partial<RewardRule> | undefined, fallback: RewardRule): RewardRule {
  const kind = value?.kind === "fixed" || value?.kind === "percent" ? value.kind : fallback.kind;
  return {
    kind,
    value: whole(value?.value, fallback.value, 1, kind === "percent" ? 100 : 1_000_000),
    appliesTo: value?.appliesTo === "total" || value?.appliesTo === "service" ? value.appliesTo : fallback.appliesTo,
  };
}

export function cleanMarketingSettings(input: Partial<MarketingSettings> | null | undefined): MarketingSettings {
  const raw = input ?? {};
  const base = defaultMarketingSettings;
  return {
    capCount: whole(raw.capCount, base.capCount, 0, 100),
    capDays: whole(raw.capDays, base.capDays, 1, 90),
    quietStart: whole(raw.quietStart, base.quietStart, 0, 23),
    quietEnd: whole(raw.quietEnd, base.quietEnd, 0, 23),
    referral: {
      enabled: Boolean(raw.referral?.enabled),
      friend: rule(raw.referral?.friend, base.referral.friend),
      reward: {
        ...rule(raw.referral?.reward, base.referral.reward),
        validDays: whole(raw.referral?.reward?.validDays, base.referral.reward.validDays, 1, 3650),
      },
    },
  };
}

export async function getMarketingSettings() {
  const row = await one<{ data: unknown }>("select data from marketing_settings where id = 1");
  return cleanMarketingSettings(json<Partial<MarketingSettings>>(row?.data, {}));
}

export async function saveMarketingSettings(next: MarketingSettings) {
  const clean = cleanMarketingSettings(next);
  await sql(
    `insert into marketing_settings (id, data, updated_at) values (1, $1::jsonb, now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [JSON.stringify(clean)],
  );
  return clean;
}

export type SmsConfig = {
  url: string;
  method: "POST" | "GET";
  format: "json" | "form" | "query";
  toField: string;
  messageField: string;
  senderField: string;
  sender: string;
  toFormat: PhoneFormat;
  authType: "none" | "bearer" | "basic" | "header";
  authUser: string;
  authHeader: string;
  extra: string;
  successMatch: string;
};

export type WhatsAppConfig = {
  phoneNumberId: string;
  apiVersion: string;
};

export const defaultSmsConfig: SmsConfig = {
  url: "",
  method: "POST",
  format: "json",
  toField: "to",
  messageField: "message",
  senderField: "sender",
  sender: "",
  toFormat: "digits",
  authType: "bearer",
  authUser: "",
  authHeader: "",
  extra: "",
  successMatch: "",
};

export const defaultWhatsAppConfig: WhatsAppConfig = { phoneNumberId: "", apiVersion: "v21.0" };

const field = (value: unknown, fallback: string, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : fallback);

export function cleanSmsConfig(input: Partial<SmsConfig> | null | undefined): SmsConfig {
  const raw = { ...defaultSmsConfig, ...(input ?? {}) };
  return {
    url: field(raw.url, "", 500),
    method: raw.method === "GET" ? "GET" : "POST",
    format: raw.format === "form" || raw.format === "query" ? raw.format : "json",
    toField: field(raw.toField, "to", 60) || "to",
    messageField: field(raw.messageField, "message", 60) || "message",
    senderField: field(raw.senderField, "sender", 60),
    sender: field(raw.sender, "", 60),
    toFormat: raw.toFormat === "plus" || raw.toFormat === "local" ? raw.toFormat : "digits",
    authType: raw.authType === "none" || raw.authType === "basic" || raw.authType === "header" ? raw.authType : "bearer",
    authUser: field(raw.authUser, "", 200),
    authHeader: field(raw.authHeader, "", 80),
    extra: field(raw.extra, "", 2000),
    successMatch: field(raw.successMatch, "", 200),
  };
}

export function cleanWhatsAppConfig(input: Partial<WhatsAppConfig> | null | undefined): WhatsAppConfig {
  const raw = { ...defaultWhatsAppConfig, ...(input ?? {}) };
  const version = field(raw.apiVersion, "v21.0", 10);
  return {
    phoneNumberId: field(raw.phoneNumberId, "", 40).replace(/\D/g, ""),
    apiVersion: /^v\d{1,2}\.\d$/.test(version) ? version : "v21.0",
  };
}

function secretKey() {
  return createHash("sha256").update(`marketing-channel:${serverEnv().authSecret}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(stored: string | null) {
  if (!stored) return null;
  try {
    const [iv, tag, body] = stored.split(".").map((part) => Buffer.from(part, "base64url"));
    if (!iv || !tag || !body) return null;
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export type ChannelState<T> = { enabled: boolean; config: T; hasSecret: boolean; secret: string | null };

export async function getSmsChannel(): Promise<ChannelState<SmsConfig>> {
  const row = await one<{ enabled: boolean; config: unknown; secret: string | null }>("select enabled, config, secret from marketing_channels where channel = 'sms'");
  return { enabled: Boolean(row?.enabled), config: cleanSmsConfig(json(row?.config, {})), hasSecret: Boolean(row?.secret), secret: decryptSecret(row?.secret ?? null) };
}

export async function getWhatsAppChannel(): Promise<ChannelState<WhatsAppConfig>> {
  const row = await one<{ enabled: boolean; config: unknown; secret: string | null }>("select enabled, config, secret from marketing_channels where channel = 'whatsapp'");
  return { enabled: Boolean(row?.enabled), config: cleanWhatsAppConfig(json(row?.config, {})), hasSecret: Boolean(row?.secret), secret: decryptSecret(row?.secret ?? null) };
}

/** `secret` undefined keeps the stored key, an empty string removes it. */
export async function saveChannel(channel: "sms" | "whatsapp", input: { enabled: boolean; config: SmsConfig | WhatsAppConfig; secret?: string }) {
  const config = channel === "sms" ? cleanSmsConfig(input.config as SmsConfig) : cleanWhatsAppConfig(input.config as WhatsAppConfig);
  const secret = input.secret === undefined ? undefined : input.secret.trim() ? encryptSecret(input.secret.trim()) : null;
  await sql(
    `insert into marketing_channels (channel, enabled, config, secret, updated_at)
     values ($1, $2, $3::jsonb, $4, now())
     on conflict (channel) do update set enabled = excluded.enabled, config = excluded.config,
       secret = case when $5 then excluded.secret else marketing_channels.secret end, updated_at = now()`,
    [channel, input.enabled, JSON.stringify(config), secret ?? null, secret !== undefined],
  );
}

export function emailReady() {
  return Boolean(process.env.RESEND_API_KEY);
}
