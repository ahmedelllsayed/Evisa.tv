import "server-only";
import { sql } from "@/lib/data/db";
import { getCurrentUser } from "@/lib/auth";

type AuditAction =
  | "user.role_updated"
  | "staff.profile_updated"
  | "staff.created"
  | "staff.removed"
  | "applications.bulk_assigned"
  | "application.status_changed"
  | "application.assignee_changed"
  | "document.status_changed"
  | "payment.refunded";

type AuditInput = {
  action: AuditAction;
  userId?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    // Get current user if not provided
    const userId = input.userId || (await getCurrentUser())?.id;

    if (!userId) {
      console.warn("[audit] No user ID provided and no current user");
      return;
    }

    await sql(
      `INSERT INTO admin_audit (user_id, action, target_id, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, input.action, input.targetId ?? null, JSON.stringify(input.details ?? {})]
    );
  } catch (error) {
    console.error("[audit] Failed to record audit log:", error);
    // Don't throw - audit failures shouldn't break the main operation
  }
}
