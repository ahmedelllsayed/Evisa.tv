import "server-only";
import type { Channel } from "@/lib/marketing/audience";
import { listCoupons } from "../coupons";
import { channelProblem } from "./campaigns";
import { listSegments, listTemplates } from "./library";
import { audienceOptions } from "./options";
import { getWhatsAppChannel } from "./settings";

/** Everything the campaign composer needs besides the campaign itself. */
export async function composerData() {
  const [options, segments, templates, coupons, email, sms, whatsapp, whatsappChannel] = await Promise.all([
    audienceOptions(),
    listSegments(),
    listTemplates(),
    listCoupons(),
    channelProblem("email"),
    channelProblem("sms"),
    channelProblem("whatsapp"),
    getWhatsAppChannel(),
  ]);
  return {
    options,
    segments: segments.map((segment) => ({ id: segment.id, name: segment.name })),
    templates: templates.map((template) => ({ id: template.id, name: template.name, channel: template.channel, content: template.content })),
    coupons: coupons.map((coupon) => ({ id: coupon.id, code: coupon.code, active: coupon.active })),
    channelReady: { email, sms, whatsapp } as Record<Channel, string | null>,
    whatsappText: whatsappChannel.config.provider === "waha",
  };
}

/** A UTC instant as `YYYY-MM-DDTHH:mm` on the Cairo wall clock, for a datetime-local field. */
export function cairoLocal(value: string | null) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
