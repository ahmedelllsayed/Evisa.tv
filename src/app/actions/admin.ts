"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import type { CmsContent, CmsTemplate } from "@/lib/cms/registry";
import { addDocument, addEvent, getApplication, patchTraveler, setAssignee, setDocumentStatus, setStatus } from "@/lib/data/applications";
import { sendMail } from "@/lib/email";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, storeFile } from "@/lib/storage";
import { deleteContactMessage, setMessageRead, setRefundRequestStatus } from "@/lib/data/inbox";
import { refundApplication } from "@/lib/payments";
import {
  createDestination,
  deleteDestination,
  deleteFaq,
  deleteHoliday,
  deleteReview,
  deleteTravelEvent,
  saveHoliday,
  saveTravelEvent,
  updateDestination,
  upsertFaq,
  upsertReview,
  type DestinationInput,
  type TravelEventInput,
} from "@/lib/data/catalog";
import { deletePage, savePage, setPagePublished } from "@/lib/data/pages";
import { clearBrandLogo, saveBrandLogo } from "@/lib/brand-logo";
import { saveDestinationMedia, type DestinationMediaKind } from "@/lib/destination-media";
import { saveCitizenshipCodes, saveSiteSettings, getSiteSettings, type SiteSettings } from "@/lib/data/settings";
import { sql } from "@/lib/data/db";
import { createUser, deleteUser, setUserBanned, setUserRole, updateUser, type UserInput } from "@/lib/data/users";
import type { ApplicationDocument, ApplicationStatus } from "@/lib/types";

async function guard(locale: string) {
  return requireAdmin(locale);
}

export async function recordAudit(action: string, target?: string, detail?: string) {
  const user = await getCurrentUser();
  await sql("insert into admin_audit (actor_email, action, target, detail) values ($1,$2,$3,$4)", [
    user?.email ?? null,
    action,
    target ?? null,
    detail ?? null,
  ]);
}

function refresh(locale: string, path = "") {
  revalidatePath(`/${locale}${path}`);
  revalidatePath(`/${locale}`, "layout");
  revalidatePath(`/${locale}/admin`, "layout");
}

export async function adminSetStatus(locale: string, id: string, status: ApplicationStatus, title: string, description: string) {
  await guard(locale);
  const result = await setStatus(id, status, { title, description, onTime: true });
  refresh(locale, "/admin");
  refresh(locale, `/admin/applications/${id}`);
  refresh(locale, "/account");
  refresh(locale, `/account/applications/${id}`);
  return result;
}

export async function adminRefund(locale: string, id: string) {
  await guard(locale);
  const result = await refundApplication(id);
  if (result.ok) await setRefundRequestStatus(id, "approved");
  refresh(locale, "/admin");
  refresh(locale, `/admin/applications/${id}`);
  refresh(locale, "/account");
  refresh(locale, `/account/applications/${id}`);
  return result;
}

export async function adminDeclineRefund(locale: string, id: string) {
  await guard(locale);
  await setRefundRequestStatus(id, "declined");
  await addEvent(id, {
    title: "Refund request declined",
    description: "Staff declined the refund request.",
    internal: true,
    onTime: true,
  });
  refresh(locale, `/admin/applications/${id}`);
  refresh(locale, `/account/applications/${id}`);
  return { ok: true as const };
}

export async function adminSetAssignee(locale: string, id: string, assigneeId: string | null) {
  await guard(locale);
  await setAssignee(id, assigneeId);
  refresh(locale, `/admin/applications/${id}`);
}

export async function adminAddEvent(locale: string, id: string, title: string, description: string) {
  await guard(locale);
  await addEvent(id, { title, description, onTime: true, internal: true });
  refresh(locale, `/admin/applications/${id}`);
}

export async function adminUploadIssuedVisa(locale: string, applicationId: string, formData: FormData) {
  await guard(locale);
  const app = await getApplication(applicationId);
  if (!app) return { ok: false as const, error: "الطلب غير موجود." };
  if (app.status !== "approved") return { ok: false as const, error: "ارفع التأشيرة بعد الموافقة على الطلب." };
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false as const, error: "اختر ملف التأشيرة." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, error: "الملف أكبر من 10 ميغابايت." };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false as const, error: "استخدم JPG أو PNG أو WebP أو PDF." };
  const storagePath = await storeFile(app.userId, app.id, file);
    const saved = await addDocument({
      applicationId: app.id,
      travelerId: null,
      kind: "issued_visa",
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      issuedByAdmin: true,
    });
  await setDocumentStatus(saved.id, "verified");
  await addEvent(app.id, {
    status: "approved",
    title: "Visa file ready",
    description: "The issued visa file is available in your account.",
    onTime: true,
  });
  if (app.userEmail) {
    await sendMail({
      to: app.userEmail,
      subject: `${app.reference}: visa file ready`,
      text: `Application ${app.reference}\nYour issued visa file is ready in your account.`,
    });
  }
  refresh(locale, `/admin/applications/${applicationId}`);
  refresh(locale, `/account/applications/${applicationId}`);
  return { ok: true as const };
}

export async function adminSetDocumentStatus(
  locale: string,
  applicationId: string,
  documentId: string,
  status: ApplicationDocument["status"],
  reason?: string,
) {
  await guard(locale);
  const result = await setDocumentStatus(documentId, status, reason);
  refresh(locale, `/admin/applications/${applicationId}`);
  refresh(locale, `/apply/${applicationId}`);
  refresh(locale, `/account/applications/${applicationId}`);
  return result;
}

export async function adminSaveDestination(locale: string, id: string | null, input: DestinationInput) {
  await guard(locale);
  try {
    const savedId = id ? (await updateDestination(id, input), id) : await createDestination(input);
    refresh(locale, "");
    refresh(locale, "/admin/destinations");
    refresh(locale, `/visa/${input.slug}`);
    return { ok: true as const, id: savedId };
  } catch (error) {
    const text = String(error);
    if (text.includes("23505") || text.includes("duplicate") || text.includes("unique")) {
      return { ok: false as const, error: "الرابط أو رمز الدولة مستخدم لوجهة أخرى." };
    }
    throw error;
  }
}

export async function adminSaveDestinationForm(locale: string, id: string | null, fd: FormData) {
  await guard(locale);
  const sourceLines = String(fd.get("sources") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sources: DestinationInput["sources"] = [];
  for (const line of sourceLines) {
    const [label, ...rest] = line.split("|");
    const url = rest.join("|").trim();
    if (!label.trim() || !/^https?:\/\//.test(url)) {
      return { ok: false as const, error: "كل مصدر يحتاج اسماً ورابطاً يبدأ بـ http أو https، بهذا الشكل: الاسم | الرابط" };
    }
    sources.push({ label: label.trim(), url });
  }
  const reasons = String(fd.get("rejectionReasons") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        title: parts[0] ?? "",
        body: parts[1] || parts[0] || "",
        titleAr: parts[2] || undefined,
        bodyAr: parts[3] || undefined,
      };
    });
  const optional = (name: string) => String(fd.get(name) || "").trim() || null;
  const input: DestinationInput = {
    name: String(fd.get("name") || "").trim(),
    nameAr: optional("nameAr"),
    slug: String(fd.get("slug") || "").trim(),
    code: String(fd.get("code") || "").trim().toUpperCase(),
    region: optional("region"),
    visaRequired: fd.get("visaRequired") === "on",
    visaType: String(fd.get("visaType") || "e-visa") as DestinationInput["visaType"],
    validity: optional("validity"),
    validityAr: optional("validityAr"),
    stay: optional("stay"),
    stayAr: optional("stayAr"),
    entry: optional("entry"),
    entryAr: optional("entryAr"),
    acceptedAt: optional("acceptedAt"),
    method: optional("method"),
    methodAr: optional("methodAr"),
    govFee: Number(fd.get("govFee") || 0),
    serviceFee: Number(fd.get("serviceFee") || 0),
    processingHours: Number(fd.get("processingHours")) || null,
    expressHours: Number(fd.get("expressHours")) || null,
    expressFee: Number(fd.get("expressFee")) || null,
    documents: String(fd.get("documents") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    image: optional("image"),
    heroImage: optional("heroImage"),
    flag: optional("flag"),
    videoUrl: optional("videoUrl"),
    cities: String(fd.get("cities") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    rejectionReasons: reasons,
    sources,
    sortOrder: Number(fd.get("sortOrder") || 0),
    isActive: fd.get("isActive") === "on",
  };
  if (!input.name || !input.slug || !input.code) {
    return { ok: false as const, error: "الاسم والرابط ورمز الدولة مطلوبة." };
  }
  const saved = await adminSaveDestination(locale, id, input);
  if (!saved.ok) return saved;
  const files: [string, DestinationMediaKind, "image" | "heroImage" | "flag" | "videoUrl"][] = [
    ["imageFile", "image", "image"],
    ["heroFile", "hero", "heroImage"],
    ["flagFile", "flag", "flag"],
    ["videoFile", "video", "videoUrl"],
  ];
  let changed = false;
  for (const [field, kind, key] of files) {
    const file = fd.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    const stored = await saveDestinationMedia(saved.id, kind, file);
    if (!stored.ok) return stored;
    input[key] = stored.url;
    changed = true;
  }
  if (changed) {
    const again = await adminSaveDestination(locale, saved.id, input);
    if (!again.ok) return again;
  }
  return { ok: true as const, id: saved.id };
}

export async function adminDeleteDestination(locale: string, id: string) {
  await guard(locale);
  const result = await deleteDestination(id);
  refresh(locale, "/admin/destinations");
  return result;
}

export async function adminSaveHoliday(locale: string, input: { id?: string; countryCode: string; date: string; name: string }) {
  await guard(locale);
  try {
    await saveHoliday(input);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "تعذر حفظ العطلة." };
  }
  refresh(locale, "");
  refresh(locale, "/admin/holidays");
  return { ok: true as const };
}

export async function adminDeleteHoliday(locale: string, id: string) {
  await guard(locale);
  await deleteHoliday(id);
  refresh(locale, "");
  refresh(locale, "/admin/holidays");
}

export async function adminSaveTravelEvent(locale: string, input: TravelEventInput) {
  await guard(locale);
  try {
    await saveTravelEvent(input);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "تعذر حفظ الفعالية." };
  }
  refresh(locale, "");
  refresh(locale, "/admin/events");
  return { ok: true as const };
}

export async function adminDeleteTravelEvent(locale: string, id: string) {
  await guard(locale);
  await deleteTravelEvent(id);
  refresh(locale, "");
  refresh(locale, "/admin/events");
}

export async function adminSaveFaq(
  locale: string,
  input: { id?: string; scope: string; category: string; categoryAr?: string | null; question: string; questionAr?: string | null; answer: string; answerAr?: string | null; destinationId: string | null; sortOrder: number },
) {
  await guard(locale);
  await upsertFaq(input);
  refresh(locale, "/admin/faqs");
}

export async function adminDeleteFaq(locale: string, id: string) {
  await guard(locale);
  await deleteFaq(id);
  refresh(locale, "/admin/faqs");
}

export async function adminSaveReview(
  locale: string,
  input: { id?: string; scope: string; author: string; location: string | null; title: string | null; titleAr?: string | null; body: string; bodyAr?: string | null; rating: number; product: string | null; destinationId: string | null },
) {
  await guard(locale);
  await upsertReview(input);
  refresh(locale, "/admin/reviews");
}

export async function adminDeleteReview(locale: string, id: string) {
  await guard(locale);
  await deleteReview(id);
  refresh(locale, "/admin/reviews");
}

export async function adminSavePage(
  locale: string,
  input: { id?: string; slug: string; template: CmsTemplate; title: string; published: boolean; sortOrder: number; content: CmsContent },
) {
  await guard(locale);
  await savePage(input);
  refresh(locale, `/${input.slug.replace(/^\/+/, "")}`);
  refresh(locale, "/admin/pages");
}

export async function adminSetPagePublished(locale: string, id: string, slug: string, published: boolean) {
  await guard(locale);
  await setPagePublished(id, published);
  refresh(locale, `/${slug}`);
  refresh(locale, "/admin/pages");
}

export async function adminDeletePage(locale: string, id: string, slug: string) {
  await guard(locale);
  const result = await deletePage(id);
  refresh(locale, `/${slug}`);
  refresh(locale, "/admin/pages");
  return result;
}

export async function adminSaveSettings(locale: string, input: SiteSettings) {
  await guard(locale);
  await saveSiteSettings(input);
  refresh(locale);
  refresh(locale, "/admin/settings");
  refresh(locale, "/visa");
  refresh(locale, "/contact");
}

export async function adminSaveSettingsForm(locale: string, fd: FormData) {
  await guard(locale);
  const current = await getSiteSettings();
  let logoUrl = current.logoUrl;
  const file = fd.get("logo");
  if (file instanceof File && file.size > 0) {
    const saved = await saveBrandLogo(file);
    if (!saved.ok) return saved;
    logoUrl = saved.url;
  } else if (fd.get("clearLogo") === "on") {
    await clearBrandLogo();
    logoUrl = "";
  }
  const offices = String(fd.get("offices") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [city, ...rest] = line.split("|");
      return { city: city.trim(), address: rest.join("|").trim() };
    })
    .filter((office) => office.city && office.address);
  await saveSiteSettings({
    name: String(fd.get("name") || ""),
    legalName: String(fd.get("legalName") || ""),
    description: String(fd.get("description") || ""),
    tagline: String(fd.get("tagline") || ""),
    generalEmail: String(fd.get("generalEmail") || ""),
    supportEmail: String(fd.get("supportEmail") || ""),
    pressEmail: String(fd.get("pressEmail") || ""),
    partnershipsEmail: String(fd.get("partnershipsEmail") || ""),
    phone: String(fd.get("phone") || ""),
    whatsapp: String(fd.get("whatsapp") || ""),
    offices,
    approvalRate: current.approvalRate,
    approvalOverall: current.approvalOverall,
    bookingUrl: String(fd.get("bookingUrl") || ""),
    logoUrl,
    extras: {
      ...current.extras,
      seoTitleEn: String(fd.get("seoTitleEn") || ""),
      seoTitleAr: String(fd.get("seoTitleAr") || ""),
      seoDescriptionEn: String(fd.get("seoDescriptionEn") || ""),
      seoDescriptionAr: String(fd.get("seoDescriptionAr") || ""),
      ogImage: String(fd.get("ogImage") || ""),
      favicon: String(fd.get("favicon") || ""),
      social: String(fd.get("social") || ""),
      showFaq: false,
      showReviews: false,
      showStats: false,
      showEvents: fd.get("showEvents") === "on",
      showMap: fd.get("showMap") === "on",
      announcementEn: String(fd.get("announcementEn") || ""),
      announcementAr: String(fd.get("announcementAr") || ""),
      gaMeasurementId: String(fd.get("gaMeasurementId") || "").trim(),
      consentEnabled: fd.get("consentEnabled") === "on",
      consentTextEn: String(fd.get("consentTextEn") || ""),
      consentTextAr: String(fd.get("consentTextAr") || ""),
      maintenance: fd.get("maintenance") === "on",
      paymobIntegrationId: String(fd.get("paymobIntegrationId") || "").replace(/\D/g, ""),
    },
  });
  await recordAudit("settings.save", "site_settings");
  refresh(locale);
  refresh(locale, "/admin/settings");
  refresh(locale, "/visa");
  refresh(locale, "/contact");
  return { ok: true as const };
}

export async function adminSetMessageRead(locale: string, id: string, read: boolean) {
  await guard(locale);
  await setMessageRead(id, read);
  refresh(locale, "/admin/messages");
}

export async function adminDeleteMessage(locale: string, id: string) {
  await guard(locale);
  await deleteContactMessage(id);
  await recordAudit("message.delete", id);
  refresh(locale, "/admin/messages");
}

export async function adminReplyMessage(locale: string, id: string, email: string, body: string) {
  await guard(locale);
  const text = body.trim();
  if (text.length < 2) return { ok: false as const, error: "اكتب الرد." };
  const sent = await sendMail({ to: email, subject: "Evisa", text });
  if (!sent.sent) return { ok: false as const, error: "تعذر إرسال البريد. تحقق من إعداد Resend." };
  await setMessageRead(id, true);
  await recordAudit("message.reply", id);
  refresh(locale, "/admin/messages");
  return { ok: true as const };
}

export async function adminPatchTraveler(
  locale: string,
  id: string,
  input: { firstName: string; lastName: string; passportNumber: string; nationality: string },
) {
  await guard(locale);
  if (!input.firstName.trim() || !input.lastName.trim()) return { ok: false as const, error: "الاسم مطلوب." };
  await patchTraveler(id, input);
  await recordAudit("traveler.update", id);
  refresh(locale, "/admin/applications");
  return { ok: true as const };
}

export async function adminSetUserBanned(locale: string, id: string, banned: boolean) {
  await guard(locale);
  const result = await setUserBanned(id, banned);
  if (result.ok) await recordAudit(banned ? "user.ban" : "user.unban", id);
  refresh(locale, "/admin/users");
  return result;
}

export async function adminSaveCitizenships(locale: string, codes: string[]) {
  await guard(locale);
  await saveCitizenshipCodes(codes);
  revalidatePath("/en-EG", "layout");
  revalidatePath("/ar-EG", "layout");
  refresh(locale, "/admin/citizenships");
  return { ok: true as const };
}

export async function adminSetUserRole(locale: string, id: string, role: "user" | "admin") {
  await guard(locale);
  const result = await setUserRole(id, role);
  refresh(locale, "/admin/users");
  refresh(locale, "/admin");
  return result;
}

export async function adminCreateUser(locale: string, input: UserInput) {
  await guard(locale);
  const result = await createUser(input);
  refresh(locale, "/admin/users");
  refresh(locale, "/admin");
  return result;
}

export async function adminUpdateUser(locale: string, id: string, input: UserInput) {
  await guard(locale);
  const result = await updateUser(id, input);
  refresh(locale, "/admin/users");
  refresh(locale, "/admin");
  return result;
}

export async function adminDeleteUser(locale: string, id: string) {
  const admin = await requireAdmin(locale);
  const result = await deleteUser(id, admin.id);
  refresh(locale, "/admin/users");
  refresh(locale, "/admin");
  return result;
}
