import "server-only";
import type { AdminPermissionAction, AdminPermissions, AdminResource, AdminRole } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { one, sql } from "@/lib/data/db";

/**
 * Role hierarchy (highest to lowest)
 */
const ROLE_HIERARCHY: AdminRole[] = ["super_admin", "admin", "manager", "operator", "support", "viewer", "user"];

/**
 * Get role level (0 = super_admin, 6 = user)
 */
function getRoleLevel(role: AdminRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if role1 is higher than or equal to role2
 */
export function isRoleHigherOrEqual(role1: AdminRole, role2: AdminRole): boolean {
  return getRoleLevel(role1) <= getRoleLevel(role2);
}

/**
 * Check if user has a specific role or higher
 */
export function hasMinRole(userRole: AdminRole, requiredRole: AdminRole): boolean {
  return isRoleHigherOrEqual(userRole, requiredRole);
}

/**
 * Check if user is an admin (any level above user)
 */
export function isAdmin(role: AdminRole): boolean {
  return role !== "user";
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(role: AdminRole): boolean {
  return role === "super_admin";
}

/**
 * Get permissions for a role from database
 */
export async function getRolePermissions(role: AdminRole): Promise<AdminPermissions | null> {
  const row = await one("SELECT resources FROM admin_permissions WHERE role = $1", [role]);
  if (!row) return null;
  return row.resources as AdminPermissions;
}

/**
 * Check if role has permission for resource/action
 */
export async function hasPermission(role: AdminRole, resource: AdminResource, action: AdminPermissionAction): Promise<boolean> {
  // Super admin has all permissions
  if (role === "super_admin") return true;

  // Regular user has no admin permissions
  if (role === "user") return false;

  const permissions = await getRolePermissions(role);
  if (!permissions) return false;

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

/**
 * Check if current user has permission
 */
export async function currentUserHasPermission(resource: AdminResource, action: AdminPermissionAction): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  return hasPermission(user.role as AdminRole, resource, action);
}

/**
 * Require specific permission or throw error
 */
export async function requirePermission(resource: AdminResource, action: AdminPermissionAction): Promise<void> {
  const has = await currentUserHasPermission(resource, action);
  if (!has) {
    throw new Error(`Permission denied: ${resource}.${action}`);
  }
}

/**
 * Check multiple permissions at once
 */
export async function hasAllPermissions(role: AdminRole, checks: Array<{ resource: AdminResource; action: AdminPermissionAction }>): Promise<boolean> {
  for (const check of checks) {
    const has = await hasPermission(role, check.resource, check.action);
    if (!has) return false;
  }
  return true;
}

/**
 * Check if has any of the permissions
 */
export async function hasAnyPermission(role: AdminRole, checks: Array<{ resource: AdminResource; action: AdminPermissionAction }>): Promise<boolean> {
  for (const check of checks) {
    const has = await hasPermission(role, check.resource, check.action);
    if (has) return true;
  }
  return false;
}

/**
 * Get all resources a role can access
 */
export async function getRoleResources(role: AdminRole): Promise<AdminResource[]> {
  if (role === "super_admin") {
    return ["applications", "users", "content", "settings", "reports", "audit", "staff"];
  }

  const permissions = await getRolePermissions(role);
  if (!permissions) return [];

  return Object.keys(permissions).filter((key) => {
    const actions = permissions[key as AdminResource];
    return actions && actions.length > 0;
  }) as AdminResource[];
}

/**
 * Check if user can manage another user based on roles
 * You can only manage users with equal or lower role
 */
export function canManageUser(managerRole: AdminRole, targetRole: AdminRole): boolean {
  // Super admin can manage anyone except other super admins (protect from self-demotion)
  if (managerRole === "super_admin") {
    return targetRole !== "super_admin";
  }

  // Admin can manage manager and below
  if (managerRole === "admin") {
    return ["manager", "operator", "support", "viewer", "user"].includes(targetRole);
  }

  // Manager and below cannot change roles
  return false;
}

/**
 * Get available roles for current user to assign
 */
export async function getAssignableRoles(): Promise<AdminRole[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const role = user.role as AdminRole;

  if (role === "super_admin") {
    return ["admin", "manager", "operator", "support", "viewer", "user"];
  }

  if (role === "admin") {
    return ["manager", "operator", "support", "viewer", "user"];
  }

  return [];
}

/**
 * Role display names (Arabic)
 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "مدير أعلى",
  admin: "مدير",
  manager: "مشرف",
  operator: "موظف تشغيل",
  support: "دعم فني",
  viewer: "مشاهد",
  user: "مستخدم",
};

/**
 * Role descriptions (Arabic)
 */
export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: "صلاحيات كاملة - إدارة الموظفين والنظام",
  admin: "صلاحيات إدارية كاملة - معالجة وإدارة المحتوى",
  manager: "إدارة الطلبات والمحتوى - بدون حذف المستخدمين",
  operator: "معالجة الطلبات فقط",
  support: "عرض الطلبات والرد على الاستفسارات",
  viewer: "عرض فقط - بدون تعديل",
  user: "مستخدم عادي - بدون صلاحيات إدارية",
};

/**
 * Permission display names (Arabic)
 */
export const PERMISSION_LABELS: Record<AdminPermissionAction, string> = {
  view: "عرض",
  create: "إنشاء",
  edit: "تعديل",
  delete: "حذف",
  assign: "تعيين",
  approve: "موافقة",
  refund: "استرداد",
  ban: "حظر",
  change_role: "تغيير الدور",
  publish: "نشر",
  export: "تصدير",
  manage: "إدارة",
};

/**
 * Resource display names (Arabic)
 */
export const RESOURCE_LABELS: Record<AdminResource, string> = {
  applications: "الطلبات",
  users: "المستخدمون",
  content: "المحتوى",
  settings: "الإعدادات",
  reports: "التقارير",
  audit: "سجل النشاط",
  staff: "الموظفون",
};
