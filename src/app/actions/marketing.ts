"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import type { CouponDraft } from "@/lib/coupon-math";
import {
  createCouponCodeBatch,
  deleteCoupon,
  duplicateCoupon,
  saveCoupon,
  setCouponActive,
} from "@/lib/data/coupons";
import { sql } from "@/lib/data/db";
import { deleteAutomation, saveAutomation, setAutomationActive, type AutomationInput } from "@/lib/data/marketing/automations";
import {
  cancelCampaign,
  channelProblem,
  continueCampaign,
  deleteCampaign,
  duplicateCampaign,
  pauseCampaign,
  previewCampaignAudience,
  retryFailed,
  saveCampaignDraft,
  scheduleCampaign,
  startCampaign,
  unscheduleCampaign,
  type CampaignInput,
} from "@/lib/data/marketing/campaigns";
import {
  deleteContactList,
  deleteSegment,
  deleteTemplate,
  importContacts,
  removeContact,
  saveContactList,
  saveSegment,
  saveTemplate,
} from "@/lib/data/marketing/library";
import { sendTestMessage, suppressAddress, unsuppressAddress, type DeliveryResult } from "@/lib/data/marketing/queue";
import { saveReferralSettings } from "@/lib/data/marketing/referrals";
import {
  getMarketingSettings,
  saveChannel,
  saveMarketingSettings,
  type MarketingSettings,
  type SmsConfig,
  type WhatsAppConfig,
} from "@/lib/data/marketing/settings";
import { resolveAudience } from "@/lib/data/marketing/audience";
import { emailOk, normalizeEmail, type AudienceFilter, type Channel } from "@/lib/marketing/audience";
import { normalizePhone } from "@/lib/marketing/phone";
import { cleanContent, contentProblem, type MessageContent } from "@/lib/marketing/render";
import { currentUserHasPermission } from "@/lib/rbac";
import { isFullAdmin } from "@/lib/rbac-constants";

async function guardMarketing(locale: string, action: "view" | "edit") {
  const user = await requireAdmin(locale);
  if (isFullAdmin(user.role)) return user;
  if (await currentUserHasPermission("settings", action)) return user;
  redirect(`/${locale}/admin`);
}

async function guardChannels(locale: string) {
  const user = await requireAdmin(locale);
  if (!isFullAdmin(user.role)) redirect(`/${locale}/admin/marketing`);
  return user;
}

function refresh(locale: string) {
  revalidatePath(`/${locale}/admin/marketing`, "layout");
}

async function audit(action: string, target?: string | null, detail?: string) {
  const user = await getCurrentUser();
  await sql("insert into admin_audit (actor_email, action, target, detail) values ($1,$2,$3,$4)", [user?.email ?? null, action, target ?? null, detail ?? null]);
}

function addressFor(channel: Channel, raw: string) {
  if (channel === "email") {
    const email = normalizeEmail(raw);
    return emailOk(email) ? email : null;
  }
  return normalizePhone(raw);
}

export async function adminSaveCoupon(locale: string, input: CouponDraft) {
  await guardMarketing(locale, "edit");
  const saved = await saveCoupon(input);
  if (!saved.ok) return saved;
  await audit("coupon.save", saved.id, input.code);
  refresh(locale);
  return saved;
}

export async function adminSetCouponActive(locale: string, id: string, active: boolean) {
  await guardMarketing(locale, "edit");
  await setCouponActive(id, active);
  await audit(active ? "coupon.enable" : "coupon.pause", id);
  refresh(locale);
  return { ok: true as const };
}

export async function adminDeleteCoupon(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const removed = await deleteCoupon(id);
  if (!removed.ok) return removed;
  await audit("coupon.delete", id);
  refresh(locale);
  return removed;
}

export async function adminDuplicateCoupon(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const copy = await duplicateCoupon(id);
  if (!copy.ok) return copy;
  await audit("coupon.duplicate", id, copy.id);
  refresh(locale);
  return copy;
}

export async function adminGenerateCodes(locale: string, couponId: string, count: number, prefix: string) {
  await guardMarketing(locale, "edit");
  const result = await createCouponCodeBatch(couponId, count, prefix || null);
  if (!result.ok) return result;
  await audit("coupon.codes", couponId, String(result.count));
  refresh(locale);
  return result;
}

export async function adminPreviewAudience(locale: string, input: { channel: Channel | null; segmentId: string | null; filter: Partial<AudienceFilter> }) {
  await guardMarketing(locale, "view");
  if (input.channel) return previewCampaignAudience({ channel: input.channel, segmentId: input.segmentId, filter: input.filter });
  const resolved = await resolveAudience(input.filter, { channel: null });
  if (!resolved.ok) return resolved;
  return { ok: true as const, total: resolved.people.length, unreachable: 0, suppressed: 0, sample: resolved.people.slice(0, 40) };
}

export async function adminSaveSegment(locale: string, input: { id?: string | null; name: string; filter: Partial<AudienceFilter> }) {
  await guardMarketing(locale, "edit");
  const saved = await saveSegment(input);
  if (!saved.ok) return saved;
  await audit("segment.save", saved.id, input.name);
  refresh(locale);
  return saved;
}

export async function adminDeleteSegment(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const removed = await deleteSegment(id);
  if (removed.ok) await audit("segment.delete", id);
  refresh(locale);
  return removed;
}

export async function adminSaveList(locale: string, input: { id?: string | null; name: string }) {
  await guardMarketing(locale, "edit");
  const saved = await saveContactList(input);
  if (saved.ok) await audit("list.save", saved.id, input.name);
  refresh(locale);
  return saved;
}

export async function adminDeleteList(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const removed = await deleteContactList(id);
  if (removed.ok) await audit("list.delete", id);
  refresh(locale);
  return removed;
}

export async function adminImportContacts(locale: string, listId: string, text: string) {
  await guardMarketing(locale, "edit");
  const result = await importContacts(listId, text);
  if (result.ok) await audit("list.import", listId, String(result.added));
  refresh(locale);
  return result;
}

export async function adminRemoveContact(locale: string, listId: string, contactId: string) {
  await guardMarketing(locale, "edit");
  await removeContact(listId, contactId);
  refresh(locale);
  return { ok: true as const };
}

export async function adminSaveTemplate(locale: string, input: { id?: string | null; name: string; channel: Channel; content: Partial<MessageContent> }) {
  await guardMarketing(locale, "edit");
  const saved = await saveTemplate(input);
  if (saved.ok) await audit("template.save", saved.id, input.name);
  refresh(locale);
  return saved;
}

export async function adminDeleteTemplate(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const removed = await deleteTemplate(id);
  if (removed.ok) await audit("template.delete", id);
  refresh(locale);
  return removed;
}

export async function adminSendTest(locale: string, input: { channel: Channel; address: string; content: Partial<MessageContent>; couponCode: string | null }) {
  await guardMarketing(locale, "edit");
  const content = cleanContent(input.content);
  const problem = contentProblem(input.channel, content) ?? (await channelProblem(input.channel));
  if (problem) return { ok: false as const, error: problem };
  const address = addressFor(input.channel, input.address);
  if (!address) return { ok: false as const, error: input.channel === "email" ? "اكتب بريداً صالحاً." : "اكتب رقم هاتف صالحاً." };
  const result = await sendTestMessage(input.channel, address, content, input.couponCode);
  if (!result.ok) return { ok: false as const, error: result.error };
  await audit("campaign.test", input.channel, address);
  return { ok: true as const };
}

export async function adminSaveCampaign(locale: string, input: CampaignInput) {
  const user = await guardMarketing(locale, "edit");
  const saved = await saveCampaignDraft(input, user.id);
  if (saved.ok) await audit("campaign.save", saved.id, input.name);
  refresh(locale);
  return saved;
}

export async function adminStartCampaign(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const result = await startCampaign(id, true);
  if (result.ok) await audit("campaign.start", id, String(result.total));
  refresh(locale);
  return result;
}

export async function adminScheduleCampaign(locale: string, id: string, localTime: string) {
  await guardMarketing(locale, "edit");
  const result = await scheduleCampaign(id, localTime);
  if (result.ok) await audit("campaign.schedule", id, localTime);
  refresh(locale);
  return result;
}

type CampaignActionResult =
  | { ok: true; progress: DeliveryResult | null; id: string | null }
  | { ok: false; error: string };

async function runCampaignAction(id: string, action: "continue" | "pause" | "cancel" | "retry" | "unschedule" | "delete" | "duplicate", actorId: string): Promise<CampaignActionResult> {
  switch (action) {
    case "continue":
    case "retry": {
      const result = action === "continue" ? await continueCampaign(id) : await retryFailed(id);
      return result.ok ? { ok: true, progress: { sent: result.sent, failed: result.failed, skipped: result.skipped, pending: result.pending, quiet: result.quiet }, id: null } : result;
    }
    case "pause":
      await pauseCampaign(id);
      return { ok: true, progress: null, id: null };
    case "unschedule":
      await unscheduleCampaign(id);
      return { ok: true, progress: null, id: null };
    case "cancel": {
      const result = await cancelCampaign(id);
      return result.ok ? { ok: true, progress: null, id: null } : result;
    }
    case "delete": {
      const result = await deleteCampaign(id);
      return result.ok ? { ok: true, progress: null, id: null } : result;
    }
    case "duplicate": {
      const result = await duplicateCampaign(id, actorId);
      return result.ok ? { ok: true, progress: null, id: result.id } : result;
    }
    default: {
      const unknown: never = action;
      return { ok: false, error: `إجراء غير معروف ${String(unknown)}` };
    }
  }
}

export async function adminCampaignAction(locale: string, id: string, action: "continue" | "pause" | "cancel" | "retry" | "unschedule" | "delete" | "duplicate") {
  const user = await guardMarketing(locale, "edit");
  const result = await runCampaignAction(id, action, user.id);
  if (result.ok) await audit(`campaign.${action}`, id);
  refresh(locale);
  return result;
}

export async function adminSaveAutomation(locale: string, input: AutomationInput) {
  await guardMarketing(locale, "edit");
  const saved = await saveAutomation(input);
  if (saved.ok) await audit("automation.save", saved.id, input.name);
  refresh(locale);
  return saved;
}

export async function adminSetAutomationActive(locale: string, id: string, active: boolean) {
  await guardMarketing(locale, "edit");
  const result = await setAutomationActive(id, active);
  if (result.ok) await audit(active ? "automation.enable" : "automation.pause", id);
  refresh(locale);
  return result;
}

export async function adminDeleteAutomation(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const result = await deleteAutomation(id);
  if (result.ok) await audit("automation.delete", id);
  refresh(locale);
  return result;
}

export async function adminSaveReferral(locale: string, input: MarketingSettings["referral"]) {
  await guardMarketing(locale, "edit");
  const saved = await saveReferralSettings(input);
  await audit("referral.save", null, saved.enabled ? "on" : "off");
  refresh(locale);
  return { ok: true as const, referral: saved };
}

export async function adminSaveLimits(locale: string, input: Pick<MarketingSettings, "capCount" | "capDays" | "quietStart" | "quietEnd">) {
  await guardChannels(locale);
  const current = await getMarketingSettings();
  const saved = await saveMarketingSettings({ ...current, ...input });
  await audit("marketing.limits", null, `${saved.capCount}/${saved.capDays} ${saved.quietStart}-${saved.quietEnd}`);
  refresh(locale);
  return { ok: true as const };
}

export async function adminSaveSms(locale: string, input: { enabled: boolean; config: SmsConfig; secret?: string }) {
  await guardChannels(locale);
  await saveChannel("sms", input);
  await audit("channel.sms", null, input.enabled ? "on" : "off");
  refresh(locale);
  return { ok: true as const };
}

export async function adminSaveWhatsApp(locale: string, input: { enabled: boolean; config: WhatsAppConfig; secret?: string }) {
  await guardChannels(locale);
  await saveChannel("whatsapp", input);
  await audit("channel.whatsapp", null, input.enabled ? "on" : "off");
  refresh(locale);
  return { ok: true as const };
}

export async function adminSuppression(locale: string, input: { channel: Channel; address: string; block: boolean }) {
  await guardMarketing(locale, "edit");
  const address = addressFor(input.channel, input.address);
  if (!address) return { ok: false as const, error: "العنوان غير صالح." };
  if (input.block) await suppressAddress(input.channel, address, "manual");
  else await unsuppressAddress(input.channel, address);
  await audit(input.block ? "suppression.add" : "suppression.remove", input.channel, address);
  refresh(locale);
  return { ok: true as const };
}
