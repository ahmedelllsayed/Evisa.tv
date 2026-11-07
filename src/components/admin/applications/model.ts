import type { Tone } from "@/components/admin/chrome";
import { canTransition } from "@/lib/application-status";
import type { ApplicationStatus } from "@/lib/types";

export const allStatuses: ApplicationStatus[] = ["draft", "payment_pending", "submitted", "in_review", "filed", "approved", "rejected", "cancelled", "refunded"];
export const closedStatuses = new Set<string>(["approved", "rejected", "cancelled", "refunded"]);
export const boardStatuses: ApplicationStatus[] = ["submitted", "in_review", "filed", "approved", "rejected", "cancelled"];

export const documentStatusLabel: Record<string, string> = {
  uploaded: "بانتظار المراجعة",
  verified: "معتمد",
  rejected: "مرفوض",
};

export const documentStatusTone: Record<string, Tone> = {
  uploaded: "warning",
  verified: "success",
  rejected: "danger",
};

/** Manual targets staff may pick. `refunded` only happens through the payment tab. */
export function manualTargets(current: ApplicationStatus, paid: boolean) {
  return allStatuses.filter(
    (status) =>
      status !== current &&
      status !== "refunded" &&
      !(paid && (status === "draft" || status === "payment_pending")) &&
      canTransition(current, status),
  );
}

export function durationLabel(ms: number) {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60000));
  if (minutes < 60) return `${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest && hours < 6 ? `${hours} س ${rest} د` : `${hours} س`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} يوم ${restHours} س` : `${days} يوم`;
}

export type Sla = {
  state: "unpaid" | "closed" | "none" | "late" | "soon" | "ok";
  tone: Tone;
  label: string;
  /** Milliseconds until the target. Negative when late. */
  remaining: number | null;
};

export function slaFor(app: { status: string; guaranteedAt: string | null; deliveredAt?: string | null }, now: string): Sla {
  if (app.status === "draft" || app.status === "payment_pending") {
    return { state: "unpaid", tone: "neutral", label: "يبدأ بعد الدفع", remaining: null };
  }
  if (closedStatuses.has(app.status)) {
    if (app.status === "approved" && app.guaranteedAt && app.deliveredAt) {
      const onTime = new Date(app.deliveredAt).getTime() <= new Date(app.guaranteedAt).getTime();
      return { state: "closed", tone: onTime ? "success" : "warning", label: onTime ? "سُلّم في الموعد" : "سُلّم بعد الموعد", remaining: null };
    }
    return { state: "closed", tone: "neutral", label: "مغلق", remaining: null };
  }
  if (!app.guaranteedAt) return { state: "none", tone: "neutral", label: "بدون موعد", remaining: null };
  const remaining = new Date(app.guaranteedAt).getTime() - new Date(now).getTime();
  if (remaining < 0) return { state: "late", tone: "danger", label: `متأخر ${durationLabel(remaining)}`, remaining };
  if (remaining < 24 * 3600 * 1000) return { state: "soon", tone: "warning", label: `متبقٍ ${durationLabel(remaining)}`, remaining };
  return { state: "ok", tone: "info", label: `متبقٍ ${durationLabel(remaining)}`, remaining };
}

export type Signals = {
  verified: number;
  uploaded: number;
  rejected: number;
  missing: number;
  paymentReview: boolean;
  refundOpen: boolean;
};

export const emptySignals: Signals = { verified: 0, uploaded: 0, rejected: 0, missing: 0, paymentReview: false, refundOpen: false };

export type Reason = { label: string; tone: Tone };

/** Why an application needs someone now, most pressing first. */
export function attentionReasons(
  app: { status: string; assigneeId: string | null; paidAt: string | null },
  signals: Signals,
  sla: Sla,
): Reason[] {
  if (closedStatuses.has(app.status)) return [];
  const reasons: Reason[] = [];
  if (sla.state === "late") reasons.push({ label: "متأخر عن الموعد", tone: "danger" });
  if (signals.paymentReview) reasons.push({ label: "دفعة تحتاج مراجعة", tone: "danger" });
  if (signals.refundOpen) reasons.push({ label: "طلب استرداد", tone: "warning" });
  if (signals.uploaded) reasons.push({ label: `${signals.uploaded} مستند للمراجعة`, tone: "warning" });
  if (signals.rejected) reasons.push({ label: `${signals.rejected} مرفوض بانتظار العميل`, tone: "neutral" });
  if (!app.assigneeId && app.status !== "draft") reasons.push({ label: "غير معيّن", tone: "warning" });
  if (app.paidAt && app.status === "submitted" && !signals.uploaded) reasons.push({ label: "مدفوع وينتظر البدء", tone: "info" });
  if (sla.state === "soon") reasons.push({ label: "الموعد خلال 24 ساعة", tone: "warning" });
  return reasons;
}

/** Lower is more urgent. */
export function urgencyRank(sla: Sla, signals: Signals, app: { status: string; assigneeId: string | null; paidAt: string | null }) {
  if (sla.state === "late") return 0;
  if (signals.paymentReview || signals.refundOpen) return 1;
  if (sla.state === "soon") return 2;
  if (signals.uploaded) return 3;
  if (!app.assigneeId && app.status !== "draft") return 4;
  if (app.paidAt && app.status === "submitted") return 5;
  if (sla.state === "unpaid") return 7;
  return 6;
}

export function sortByUrgency<T extends { status: string; assigneeId: string | null; paidAt: string | null; guaranteedAt: string | null; createdAt: string; id: string }>(
  apps: T[],
  signals: Record<string, Signals>,
  now: string,
) {
  const scored = apps.map((app) => {
    const sla = slaFor(app, now);
    return { app, sla, rank: urgencyRank(sla, signals[app.id] ?? emptySignals, app) };
  });
  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const ar = a.sla.remaining ?? Number.POSITIVE_INFINITY;
    const br = b.sla.remaining ?? Number.POSITIVE_INFINITY;
    if (ar !== br) return ar - br;
    return a.app.createdAt < b.app.createdAt ? -1 : a.app.createdAt > b.app.createdAt ? 1 : 0;
  });
  return scored;
}

export function fileHref(storagePath: string) {
  return `/api/files/${storagePath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

export function isImage(doc: { mimeType: string | null; fileName: string }) {
  return Boolean(doc.mimeType?.startsWith("image/")) || /\.(jpe?g|png|webp|gif)$/i.test(doc.fileName);
}

export function isPdf(doc: { mimeType: string | null; fileName: string }) {
  return doc.mimeType === "application/pdf" || doc.fileName.toLowerCase().endsWith(".pdf");
}

export function fileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
