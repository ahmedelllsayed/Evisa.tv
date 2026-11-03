import type { ApplicationStatus } from "@/lib/types";

const adminTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["payment_pending", "cancelled", "refunded"],
  payment_pending: ["draft", "submitted", "cancelled", "refunded"],
  submitted: ["in_review", "filed", "approved", "rejected", "cancelled", "refunded"],
  in_review: ["submitted", "filed", "approved", "rejected", "cancelled", "refunded"],
  filed: ["in_review", "approved", "rejected", "cancelled", "refunded"],
  approved: ["refunded"],
  rejected: ["in_review", "refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus, source: "admin" | "payment" = "admin") {
  if (from === to) return true;
  if (source === "payment") {
    if (to === "submitted") return from === "draft" || from === "payment_pending";
    if (to === "payment_pending") return from === "draft";
    if (to === "refunded") return from !== "refunded";
    return false;
  }
  return adminTransitions[from].includes(to);
}

export function transitionError(from: ApplicationStatus, to: ApplicationStatus) {
  return `لا يمكن نقل الطلب من ${from} إلى ${to}.`;
}
