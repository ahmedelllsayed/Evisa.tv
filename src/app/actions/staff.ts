"use server";
import { revalidatePath } from "next/cache";
import type { AdminRole } from "@/lib/types";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/data/db";
import { getAssignableRoles, canManageUser, currentUserHasPermission } from "@/lib/rbac";
import { upsertStaffProfile, deleteStaffProfile } from "@/lib/data/staff";
import { audit } from "@/lib/audit";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * Update user role (requires super_admin or admin)
 */
export async function updateUserRole(userId: string, newRole: AdminRole, locale: string): Promise<ActionResult> {
  try {
    const currentUser = await requireAdmin(locale);

    // Check permission
    const canChangeRole = await currentUserHasPermission("users", "change_role");
    if (!canChangeRole) {
      return { success: false, error: "ليس لديك صلاحية تغيير الأدوار" };
    }

    // Get target user current role
    const targetUser = await sql("SELECT role FROM profiles WHERE id = $1", [userId]);
    if (!targetUser.length) {
      return { success: false, error: "المستخدم غير موجود" };
    }

    const targetRole = targetUser[0].role as AdminRole;

    // Check if current user can manage target user
    if (!canManageUser(currentUser.role as AdminRole, targetRole)) {
      return { success: false, error: "لا يمكنك تغيير دور هذا المستخدم" };
    }

    // Check if new role is assignable
    const assignableRoles = await getAssignableRoles();
    if (!assignableRoles.includes(newRole)) {
      return { success: false, error: "لا يمكنك تعيين هذا الدور" };
    }

    // Update role
    await sql("UPDATE profiles SET role = $1 WHERE id = $2", [newRole, userId]);

    // Audit log
    await audit({
      action: "user.role_updated",
      userId: currentUser.id,
      targetId: userId,
      details: { oldRole: targetRole, newRole },
    });

    revalidatePath(`/${locale}/admin/users`);
    revalidatePath(`/${locale}/admin/staff`);

    return { success: true };
  } catch (error) {
    console.error("updateUserRole error:", error);
    return { success: false, error: error instanceof Error ? error.message : "حدث خطأ" };
  }
}

/**
 * Update staff profile
 */
export async function updateStaffProfile(
  userId: string,
  input: {
    department?: string | null;
    specialty?: string[];
    maxApplications?: number;
    notes?: string | null;
    active?: boolean;
    hiredAt?: string | null;
  },
  locale: string
): Promise<ActionResult> {
  try {
    const currentUser = await requireAdmin(locale);

    // Check permission
    const canManageStaff = await currentUserHasPermission("staff", "manage");
    if (!canManageStaff) {
      return { success: false, error: "ليس لديك صلاحية إدارة الموظفين" };
    }

    await upsertStaffProfile(userId, input);

    // Audit log
    await audit({
      action: "staff.profile_updated",
      userId: currentUser.id,
      targetId: userId,
      details: input,
    });

    revalidatePath(`/${locale}/admin/staff`);

    return { success: true };
  } catch (error) {
    console.error("updateStaffProfile error:", error);
    return { success: false, error: error instanceof Error ? error.message : "حدث خطأ" };
  }
}

/**
 * Remove staff profile (convert to regular user)
 */
export async function removeStaffProfile(userId: string, locale: string): Promise<ActionResult> {
  try {
    const currentUser = await requireAdmin(locale);

    // Check permission
    const canManageStaff = await currentUserHasPermission("staff", "manage");
    if (!canManageStaff) {
      return { success: false, error: "ليس لديك صلاحية إدارة الموظفين" };
    }

    await deleteStaffProfile(userId);

    // Also set role to user
    await sql("UPDATE profiles SET role = 'user' WHERE id = $1", [userId]);

    // Audit log
    await audit({
      action: "staff.removed",
      userId: currentUser.id,
      targetId: userId,
    });

    revalidatePath(`/${locale}/admin/staff`);
    revalidatePath(`/${locale}/admin/users`);

    return { success: true };
  } catch (error) {
    console.error("removeStaffProfile error:", error);
    return { success: false, error: error instanceof Error ? error.message : "حدث خطأ" };
  }
}

/**
 * Promote user to staff
 */
export async function promoteToStaff(
  userId: string,
  input: {
    role: AdminRole;
    department?: string;
    specialty?: string[];
    maxApplications?: number;
  },
  locale: string
): Promise<ActionResult> {
  try {
    const currentUser = await requireAdmin(locale);

    // Check permission
    const canChangeRole = await currentUserHasPermission("users", "change_role");
    const canManageStaff = await currentUserHasPermission("staff", "manage");

    if (!canChangeRole || !canManageStaff) {
      return { success: false, error: "ليس لديك صلاحية إضافة موظفين" };
    }

    // Check if role is assignable
    const assignableRoles = await getAssignableRoles();
    if (!assignableRoles.includes(input.role)) {
      return { success: false, error: "لا يمكنك تعيين هذا الدور" };
    }

    // Update role
    await sql("UPDATE profiles SET role = $1 WHERE id = $2", [input.role, userId]);

    // Create staff profile
    await upsertStaffProfile(userId, {
      department: input.department ?? null,
      specialty: input.specialty ?? [],
      maxApplications: input.maxApplications ?? 10,
      active: true,
      hiredAt: new Date().toISOString().split("T")[0],
    });

    // Audit log
    await audit({
      action: "staff.created",
      userId: currentUser.id,
      targetId: userId,
      details: { role: input.role, ...input },
    });

    revalidatePath(`/${locale}/admin/staff`);
    revalidatePath(`/${locale}/admin/users`);

    return { success: true };
  } catch (error) {
    console.error("promoteToStaff error:", error);
    return { success: false, error: error instanceof Error ? error.message : "حدث خطأ" };
  }
}

/**
 * Bulk assign applications to staff
 */
export async function bulkAssignApplications(applicationIds: string[], assigneeId: string, locale: string): Promise<ActionResult> {
  try {
    const currentUser = await requireAdmin(locale);

    // Check permission
    const canAssign = await currentUserHasPermission("applications", "assign");
    if (!canAssign) {
      return { success: false, error: "ليس لديك صلاحية تعيين الطلبات" };
    }

    // Update applications
    await sql("UPDATE applications SET assignee_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])", [assigneeId, applicationIds]);

    // Audit log
    await audit({
      action: "applications.bulk_assigned",
      userId: currentUser.id,
      details: { assigneeId, count: applicationIds.length },
    });

    revalidatePath(`/${locale}/admin/queue`);

    return { success: true };
  } catch (error) {
    console.error("bulkAssignApplications error:", error);
    return { success: false, error: error instanceof Error ? error.message : "حدث خطأ" };
  }
}
