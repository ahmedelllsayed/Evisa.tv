"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import type { AudienceFilter, AudienceSelection } from "@/lib/campaign-mail";
import {
  createCampaign,
  deleteMarketingContact,
  deliverCampaignBatch,
  importMarketingContacts,
  previewAudience,
} from "@/lib/data/campaigns";
import { sql } from "@/lib/data/db";
import { currentUserHasPermission } from "@/lib/rbac";
import { isFullAdmin } from "@/lib/rbac-constants";

async function guardMarketing(locale: string, action: "view" | "edit") {
  const user = await requireAdmin(locale);
  if (isFullAdmin(user.role)) return user;
  if (await currentUserHasPermission("settings", action)) return user;
  redirect(`/${locale}/admin`);
}

function refresh(locale: string) {
  revalidatePath(`/${locale}/admin/campaigns`);
  revalidatePath(`/${locale}/admin`, "layout");
}

async function audit(action: string, target?: string, detail?: string) {
  const user = await getCurrentUser();
  await sql("insert into admin_audit (actor_email, action, target, detail) values ($1,$2,$3,$4)", [
    user?.email ?? null,
    action,
    target ?? null,
    detail ?? null,
  ]);
}

export async function adminPreviewAudience(locale: string, filter: AudienceFilter) {
  await guardMarketing(locale, "view");
  return previewAudience(filter);
}

export async function adminImportContacts(locale: string, text: string) {
  await guardMarketing(locale, "edit");
  const result = await importMarketingContacts(text);
  if (!result.ok) return result;
  await audit("campaign.import", undefined, String(result.added));
  refresh(locale);
  return result;
}

export async function adminDeleteContact(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const result = await deleteMarketingContact(id);
  if (!result.ok) return result;
  await audit("campaign.contact.delete", id);
  refresh(locale);
  return result;
}

export async function adminSendCampaign(
  locale: string,
  input: { filter: AudienceFilter; selection: AudienceSelection; subject: string; body: string; couponId: string | null },
) {
  const user = await guardMarketing(locale, "edit");
  const result = await createCampaign({ ...input, actorId: user.id });
  if (!result.ok) return result;
  await audit("campaign.send", result.id, String(result.sent));
  refresh(locale);
  return result;
}

export async function adminContinueCampaign(locale: string, id: string) {
  await guardMarketing(locale, "edit");
  const result = await deliverCampaignBatch(id);
  if (!result.ok) return result;
  await audit("campaign.continue", id, String(result.sent));
  refresh(locale);
  return result;
}
